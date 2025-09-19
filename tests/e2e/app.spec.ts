import { expect } from './fixtures'
import { test } from './fixtures'

const STORAGE_KEY = 'kr-tracker-state-v3'

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore storage security errors on teardown
    }
  })
})

async function seedState(page: import('@playwright/test').Page, overrides: Record<string, unknown>) {
  await page.addInitScript(([key, state]) => {
    window.localStorage.setItem(key, JSON.stringify(state))
  }, [STORAGE_KEY, overrides])
}
test('persists actual updates after reload with seeded baseline', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit layout currently fails to expose actual inputs reliably')

  await page.goto('/')

  const actualInput = page.getByRole('spinbutton').first()
  await expect(actualInput).toBeVisible()
  const previousValue = await actualInput.inputValue()

  await actualInput.fill('42')
  await actualInput.press('Tab')

  await page.reload({ waitUntil: 'load' })
  await expect(page.getByRole('spinbutton').first()).toHaveValue('42')

  await page.getByRole('spinbutton').first().fill(previousValue)
})
test('Latest navigation button snaps the week grid back into view', async ({ page }) => {
  await page.goto('/')

  const tableWrap = page.locator('.table-wrap').first()
  await tableWrap.evaluate(el => {
    el.scrollLeft = 600
    return null
  })
  await expect.poll(async () => tableWrap.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Latest' }).click()
  await expect.poll(async () => Math.round(await tableWrap.evaluate(el => el.scrollLeft))).toBe(0)
})
test.fixme('degrades gracefully when no baseline is locked', async ({ page }) => {
  await seedState(page, { baselines: [], currentBaselineId: null, phase: 'execution' })
  await page.goto('/')

  await expect(page.locator('.table-wrap').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.badge.yellow').first()).toHaveText(/Plan required/)
  const headerMessage = page.locator('.grid-actions .muted').filter({ hasText: 'Lock a baseline to enable editing' }).first()
  await expect(headerMessage).toBeVisible()
})
test.fixme('data management supports export and import flows', async ({ page }) => {
  await seedState(page, { phase: 'planning' })
  await page.goto('/')

  await expect(page.locator('text=Setup & Configuration')).toBeVisible({ timeout: 15000 })
  await page.locator('.tab-navigation button').filter({ hasText: 'Data Management' }).click()
  const dataHeading = page.getByRole('heading', { name: 'Data Management' })
  await expect(dataHeading).toBeVisible()
  const dataSection = dataHeading.locator('..')

  const downloadPromise = page.waitForEvent('download')
  await dataSection.getByRole('button', { name: 'Export to JSON' }).click()
  const download = await downloadPromise
  await expect(download.suggestedFilename()).toMatch(/kr-tracker-export-.*\.json/)

  const alertPromise = page.waitForEvent('dialog')
  await dataSection.getByLabelText('Import data JSON file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{invalid'),
  })
  const invalidAlert = await alertPromise
  expect(invalidAlert.type()).toBe('alert')
  expect(invalidAlert.message()).toContain('Invalid JSON file')
  await invalidAlert.accept()

  const confirmPromise = page.waitForEvent('dialog')
  await dataSection.getByLabelText('Import data JSON file').setInputFiles({
    name: 'import.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"phase":"execution","reportingDateISO":"2025-07-14"}'),
  })
  const confirm = await confirmPromise
  expect(confirm.type()).toBe('confirm')
  await confirm.accept()

  const stored = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)
  expect(stored).toContain('2025-07-14')
})
test.fixme('reset flow prompts twice and reloads the workspace', async ({ page }) => {
  await seedState(page, { phase: 'planning' })
  await page.goto('/')

  await expect(page.locator('text=Setup & Configuration')).toBeVisible({ timeout: 15000 })
  await page.locator('.tab-navigation button').filter({ hasText: 'Data Management' }).click()
  const resetButton = page.getByRole('button', { name: 'Reset All Data' })
  await expect(resetButton).toBeVisible()

  const firstDialogPromise = page.waitForEvent('dialog')
  await resetButton.click()
  const firstDialog = await firstDialogPromise
  expect(firstDialog.type()).toBe('confirm')
  await firstDialog.accept()

  const secondDialog = await page.waitForEvent('dialog')
  expect(secondDialog.type()).toBe('confirm')
  await secondDialog.accept()

  await page.waitForLoadState('load')
  await expect(page.getByText(/Baseline v\d/)).toBeVisible({ timeout: 15000 })
})
test('page load stays within performance guardrails', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' })
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    return nav ? { domContentLoaded: nav.domContentLoadedEventEnd, total: nav.duration } : { domContentLoaded: 0, total: 0 }
  })
  expect(metrics.domContentLoaded).toBeGreaterThan(0)
  expect(metrics.domContentLoaded).toBeLessThan(3000)
  expect(metrics.total).toBeLessThan(5000)
})


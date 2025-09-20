import { expect } from './fixtures'
import { test } from './fixtures'

const STORAGE_KEY = 'kr-tracker-state-v3'

type StoredPerson = {
  name?: string
  teamId?: string | null
}

type PersistedAppState = {
  people?: StoredPerson[]
}

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
test.skip('degrades gracefully when no baseline is locked', async ({ page }) => {
  await seedState(page, { baselines: [], currentBaselineId: null, phase: 'execution' })
  await page.goto('/')

  await expect(page.locator('.table-wrap').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.badge.yellow').first()).toHaveText(/Plan required/)
  const headerMessage = page.locator('.grid-actions .muted').filter({ hasText: 'Lock a baseline to enable editing' }).first()
  await expect(headerMessage).toBeVisible()
})
test.skip('data management supports export and import flows', async ({ page }) => {
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
test.skip('reset flow prompts twice and reloads the workspace', async ({ page }) => {
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

test('organization manager supports teamless and team-assigned person creation', async ({ page }) => {
  const unique = Date.now()
  const teamlessName = `Playwright Teamless ${unique}`
  const teamlessEmail = `teamless-${unique}@example.com`
  const withTeamName = `Playwright With Team ${unique}`
  const withTeamEmail = `with-team-${unique}@example.com`

  await page.goto('/')

  const addPersonFromHeader = page.getByRole('button', { name: 'Add Person' })
  await addPersonFromHeader.click()

  const personDialog = page.getByRole('dialog', { name: /Add New Person/i })
  await expect(personDialog).toBeVisible()

  await personDialog.locator('#person-name').fill('   ')
  await personDialog.locator('#person-email').fill('   ')
  await personDialog.getByRole('button', { name: 'Add Person' }).click()
  await expect(personDialog).toBeVisible()

  await personDialog.locator('#person-name').fill(teamlessName)
  await personDialog.locator('#person-email').fill(teamlessEmail)
  const functionSelect = personDialog.locator('#person-function')
  if (await functionSelect.count()) {
    await functionSelect.selectOption({ value: 'Product' })
  }
  await expect(personDialog.locator('#person-pod')).toHaveCount(0)

  await personDialog.getByRole('button', { name: 'Add Person' }).click()
  await expect(personDialog).toBeHidden()

  const orgHeading = page.getByRole('heading', { name: 'Organization Structure' })
  await orgHeading.click()

  const teamlessEntry = page.locator('div').filter({ has: page.locator('span', { hasText: teamlessName }) }).first()
  await expect(teamlessEntry).toBeVisible()
  await expect(teamlessEntry.locator('[data-slot="badge"]').first()).toHaveText('Unknown Team')

  await expect.poll(async () => {
    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as PersistedAppState
    const people = Array.isArray(parsed.people) ? parsed.people : []
    const person = people.find(candidate => candidate?.name === teamlessName)
    return person ? person.teamId ?? '' : null
  }).toBe('')

  await orgHeading.click()
  await expect(addPersonFromHeader).toBeVisible()
  await addPersonFromHeader.click()

  const addDialogSecond = page.getByRole('dialog', { name: /Add New Person/i })
  await expect(addDialogSecond).toBeVisible()

  await addDialogSecond.locator('#person-name').fill(withTeamName)
  await addDialogSecond.locator('#person-email').fill(withTeamEmail)
  await addDialogSecond.locator('#person-function').selectOption({ value: 'Product' })
  await expect(addDialogSecond.locator('#person-pod')).toHaveCount(0)
  await addDialogSecond.locator('#person-team').selectOption({ label: 'Growth' })
  const podSelect = addDialogSecond.locator('#person-pod')
  await expect(podSelect).toBeVisible()
  await podSelect.selectOption({ label: 'Menu' })
  await addDialogSecond.getByRole('button', { name: 'Add Person' }).click()
  await expect(addDialogSecond).toBeHidden()

  await orgHeading.click()
  const withTeamEntry = page.locator('div').filter({ has: page.locator('span', { hasText: withTeamName }) }).first()
  await expect(withTeamEntry).toBeVisible()
  await expect(withTeamEntry.locator('[data-slot="badge"]').first()).toHaveText('Growth')

  await expect.poll(async () => {
    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as PersistedAppState
    const people = Array.isArray(parsed.people) ? parsed.people : []
    const person = people.find(candidate => candidate?.name === withTeamName)
    return person ? person.teamId ?? null : null
  }).toBe('team-2')
})

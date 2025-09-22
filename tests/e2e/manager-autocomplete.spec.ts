import { test, expect } from './fixtures'

// Verifies the manager autocomplete dropdown closes on outside click and when clicking Save
// Ensures the dropdown no longer blocks the dialog footer buttons

test('Manager autocomplete closes on outside click and Save is clickable', async ({ page }) => {
  await page.goto('/')

  // Wait for the Organization Structure card to load on the landing page
  const orgHeading = page.getByRole('heading', { name: 'Organization Structure' })
  await expect(orgHeading).toBeVisible({ timeout: 15000 })

  // Open the Add Person dialog from the card header (visible in collapsed state)
  await page.getByRole('button', { name: 'Add Person' }).first().click()
  const dialog = page.getByRole('dialog', { name: /Add New Person/i })
  await expect(dialog).toBeVisible()

  const managerInput = dialog.locator('#person-manager')
  await managerInput.focus()
  await managerInput.fill('Ben')

  // Expect a suggestion to show up (uses seeded data that includes Ben Chandler)
  const suggestion = dialog.getByText('Ben Chandler', { exact: false }).first()
  await expect(suggestion).toBeVisible()

  // Click the dialog title area to simulate outside click from the autocomplete
  await dialog.getByRole('heading', { name: /Add New Person/i }).click()

  // The suggestion list should close
  await expect(suggestion).toBeHidden()

  // Reopen suggestions
  await managerInput.focus()
  await managerInput.fill('Ben')
  await expect(suggestion).toBeVisible()

  // Click the Save button while suggestions are open
  const saveButton = dialog.getByRole('button', { name: /Add Person|Save Changes/ })
  await saveButton.click()

  // The dialog should still be visible (form invalid), but dropdown must be closed
  await expect(dialog).toBeVisible()
  await expect(suggestion).toBeHidden()
})

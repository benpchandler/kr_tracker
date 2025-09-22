import { expect } from './fixtures';
import { test } from './fixtures';
import { escapeSqlString, execSqlite, querySqliteJson } from './utils/sqlite';

const getPersonByEmail = (email: string) => {
  const rows = querySqliteJson<{ id: string; name: string }>(
    `SELECT id, name FROM individuals WHERE email='${escapeSqlString(email)}' LIMIT 1;`
  );
  return rows.length > 0 ? rows[0] : null;
};

const deletePersonById = (id: string) => {
  execSqlite(`DELETE FROM individuals WHERE id='${escapeSqlString(id)}'`);
};

test.describe('planning mode persistence', () => {
  test('adding a person persists to the sqlite database', async ({ page }) => {
    const unique = Date.now().toString(36);
    const personName = `Planning Test ${unique}`;
    const personEmail = `planning-${unique}@example.com`;

    let insertedId: string | undefined;

    try {
      await page.goto('/');
      await page.getByRole('button', { name: 'Plan Mode' }).click();

      const addPersonButton = page.getByRole('button', { name: 'Add Person' }).first();
      await addPersonButton.click();

      const dialog = page.getByRole('dialog', { name: /Add New Person/i });
      await expect(dialog).toBeVisible();

      await dialog.locator('#person-name').fill(personName);
      await dialog.locator('#person-email').fill(personEmail);
      const functionSelect = dialog.locator('#person-function');
      if (await functionSelect.count()) {
        await functionSelect.selectOption({ value: 'Product' });
      }

      const responsePromise = page.waitForResponse(response =>
        response.url().includes('/api/person') && response.request().method() === 'POST'
      );

      await dialog.getByRole('button', { name: 'Add Person' }).click();
      const response = await responsePromise;
      const responseText = await response.text();
      expect(response.ok(), `Unexpected response: ${response.status()} ${responseText}`).toBeTruthy();
      await expect(dialog).toBeHidden();

      await expect.poll(() => {
        const row = getPersonByEmail(personEmail);
        if (!row) {
          return null;
        }
        insertedId = row.id as string;
        return row.name as string;
      }, { message: 'Expected person record to be written to the database.' }).toBe(personName);

      expect(insertedId).toBeTruthy();
    } finally {
      if (insertedId) {
        deletePersonById(insertedId);
      }
    }
  });
});

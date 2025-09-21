import { expect } from './fixtures';
import { test } from './fixtures';
import { escapeSqlString, execSqlite, querySqliteJson } from './utils/sqlite';

test.describe('planning mode org entities persistence', () => {
  test('adding teams, pods, and functions persists to sqlite database', async ({ page }) => {
    const unique = Date.now().toString(36);
    const teamName = `Playwright Team ${unique}`;
    const teamDescription = `Automated team ${unique}`;
    const podName = `Playwright Pod ${unique}`;
    const podDescription = `Automated pod ${unique}`;
    const functionName = `Playwright Function ${unique}`;
    const functionDescription = `Automated function ${unique}`;

    let insertedTeamId: string | undefined;
    let insertedPodId: string | undefined;
    let insertedFunctionId: string | undefined;

    try {
      await page.goto('/');
      await page.getByRole('button', { name: 'Plan Mode' }).click();

      // Add Team
      const teamResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/team') && response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /^Add Team$/i }).first().click();
      const teamDialog = page.getByRole('dialog', { name: /Add New Team/i });
      await expect(teamDialog).toBeVisible();

      await teamDialog.locator('#team-name').fill(teamName);
      await teamDialog.locator('#team-description').fill(teamDescription);
      await teamDialog.getByRole('button', { name: /Add Team/i }).click();

      const teamResponse = await teamResponsePromise;
      expect(teamResponse.ok()).toBeTruthy();
      const teamPayload = await teamResponse.json();
      insertedTeamId = teamPayload?.team?.id ?? undefined;

      await expect.poll(() => {
        const rows = querySqliteJson<{ id: string; name: string; color: string | null; description: string | null }>(
          `SELECT id, name, color, description FROM teams WHERE name='${escapeSqlString(teamName)}' LIMIT 1;`
        );
        if (rows.length === 0) {
          return null;
        }
        const row = rows[0];
        insertedTeamId = row.id;
        return row.description;
      }, { message: 'Expected team record to be written to the database.' }).toBe(teamDescription);

      expect(insertedTeamId).toBeTruthy();

      // Add Pod
      await page.getByRole('button', { name: /^Add Pod$/i }).first().click();
      const podDialog = page.getByRole('dialog', { name: /Add New Pod/i });
      await expect(podDialog).toBeVisible();

      const teamSelect = podDialog.getByTestId('pod-team-trigger');
      await expect(teamSelect).toBeVisible();
      // Radix Select uses a portal; click can be flaky if animations/overlays are mid-transition.
      await teamSelect.click({ force: true });
      const teamOption = page.getByRole('option', { name: teamName }); // use page root due to portal
      await expect(teamOption).toBeVisible();
      await teamOption.click();

      const podNameInput = podDialog.locator('#pod-name');
      await expect(podNameInput).toBeEnabled();
      await podNameInput.fill(podName);
      await podDialog.locator('#pod-description').fill(podDescription);

      // Start waiting for the network response just before submitting the form
      const podResponsePromise = page.waitForResponse(
        response => response.url().includes('/api/pod') && response.request().method() === 'POST',
        { timeout: 30000 }
      );
      await podDialog.getByRole('button', { name: /Add Pod/i }).click();

      const podResponse = await podResponsePromise;
      expect(podResponse.ok()).toBeTruthy();
      const podPayload = await podResponse.json();
      insertedPodId = podPayload?.pod?.id ?? undefined;

      await expect.poll(() => {
        const rows = querySqliteJson<{ id: string; name: string; teamId: string; description: string | null }>(
          `SELECT id, name, teamId, description FROM pods WHERE name='${escapeSqlString(podName)}' LIMIT 1;`
        );
        if (rows.length === 0) {
          return null;
        }
        const row = rows[0];
        insertedPodId = row.id;
        return row.teamId === insertedTeamId ? row.description : null;
      }, { message: 'Expected pod record to be written to the database.' }).toBe(podDescription);

      expect(insertedPodId).toBeTruthy();

      // Add Function
      const functionResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/function') && response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /^Add Function$/i }).first().click();
      const functionDialog = page.getByRole('dialog', { name: /Add New Function/i });
      await expect(functionDialog).toBeVisible();

      await functionDialog.locator('#function-name').fill(functionName);
      await functionDialog.locator('#function-description').fill(functionDescription);
      await functionDialog.getByRole('button', { name: /Add Function/i }).click();

      const functionResponse = await functionResponsePromise;
      expect(functionResponse.ok()).toBeTruthy();
      const functionPayload = await functionResponse.json();
      insertedFunctionId = functionPayload?.function?.id ?? undefined;

      await expect.poll(() => {
        const rows = querySqliteJson<{ id: string; name: string; description: string | null }>(
          `SELECT id, name, description FROM functions WHERE name='${escapeSqlString(functionName)}' LIMIT 1;`
        );
        if (rows.length === 0) {
          return null;
        }
        const row = rows[0];
        insertedFunctionId = row.id;
        return row.description;
      }, { message: 'Expected function record to be written to the database.' }).toBe(functionDescription);

      expect(insertedFunctionId).toBeTruthy();
    } finally {
      if (insertedPodId) {
        execSqlite(`DELETE FROM pods WHERE id='${escapeSqlString(insertedPodId)}'`);
      }
      if (insertedTeamId) {
        execSqlite(`DELETE FROM teams WHERE id='${escapeSqlString(insertedTeamId)}'`);
      }
      if (insertedFunctionId) {
        execSqlite(`DELETE FROM functions WHERE id='${escapeSqlString(insertedFunctionId)}'`);
      }
    }
  });
});

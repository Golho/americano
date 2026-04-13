import { test, expect } from '@playwright/test';
import { clearAppState, quickSetup } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
});

test('state is restored after a page reload', async ({ page }) => {
  await quickSetup(page, { courts: 2, players: 8, rounds: 3 });

  // Enter a score so there is something distinguishable to check
  const scoreInputs = page.locator('.score-input');
  await scoreInputs.nth(0).fill('21');
  await scoreInputs.nth(1).fill('15');

  // Reload and verify schedule is still visible
  await page.reload();
  await page.waitForSelector('.match-card');

  await expect(page.locator('.round-nav-label')).toContainText('Round 1 of 3');

  // Score should be restored
  await expect(page.locator('.score-input').nth(0)).toHaveValue('21');
  await expect(page.locator('.score-input').nth(1)).toHaveValue('15');
});

test('tournament name is restored after reload', async ({ page }) => {
  // Set a name before generating
  await page.getByRole('button', { name: '2 courts' }).click();
  await page.getByRole('button', { name: '8 players' }).click();
  const nameInput = page.locator('input[placeholder="e.g. Club Night #12"]');
  await nameInput.fill('Club Night #99');
  await page.getByRole('button', { name: 'GENERATE TOURNAMENT SCHEDULE' }).click();
  await page.waitForSelector('.match-card');

  await page.reload();
  await page.waitForSelector('.match-card');

  await expect(page.locator('.info-chip').filter({ hasText: 'Club Night #99' })).toBeVisible();
});

test('creating a second tournament and loading via manager', async ({ page }) => {
  // Create first tournament
  await quickSetup(page, { courts: 2, players: 8, rounds: 2 });

  // Create second tournament
  await page.getByRole('button', { name: 'New' }).click();
  // Confirm modal
  await page.getByRole('button', { name: 'Confirm' }).click();

  await quickSetup(page, { courts: 2, players: 4, rounds: 2 });

  // Open manager — should show 2 tournaments
  await page.getByRole('button', { name: 'Load' }).click();
  const tournamentItems = page.locator('.tournament-item');
  await expect(tournamentItems).toHaveCount(2);

  // Load the non-current one
  await page.locator('.btn-load').first().click();
  await page.waitForSelector('.match-card');

  // Manager is closed
  await expect(page.locator('.tournament-manager')).toBeHidden();
});

test('deleting a tournament removes it from the manager', async ({ page }) => {
  // Create first
  await quickSetup(page, { courts: 2, players: 4, rounds: 2 });

  // New → create second
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await quickSetup(page, { courts: 2, players: 4, rounds: 2 });

  // Open manager
  await page.getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('.tournament-item')).toHaveCount(2);

  // Delete the first non-current item
  const deleteBtn = page.locator('.btn-delete').first();
  await deleteBtn.click();

  // Confirm deletion
  await page.getByRole('button', { name: 'Confirm' }).click();

  // Only 1 tournament left
  await expect(page.locator('.tournament-item')).toHaveCount(1);
});

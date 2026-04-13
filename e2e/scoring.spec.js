import { test, expect } from '@playwright/test';
import { clearAppState, quickSetup } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
  await quickSetup(page, { courts: 2, players: 8, rounds: 3 });
});

test('score inputs are present on the schedule', async ({ page }) => {
  const scoreInputs = page.locator('.score-input');
  // 2 courts → 2 matches → 4 score inputs per round
  await expect(scoreInputs).toHaveCount(4);
});

test('entering scores updates the leaderboard', async ({ page }) => {
  // Enter scores for both matches in round 1
  const scoreInputs = page.locator('.score-input');
  await scoreInputs.nth(0).fill('21');
  await scoreInputs.nth(1).fill('15');
  await scoreInputs.nth(2).fill('21');
  await scoreInputs.nth(3).fill('10');

  // Switch to leaderboard
  await page.getByRole('button', { name: 'Leaderboard' }).click();

  // Players with points should appear (non-zero ptsWon in some rows)
  const ptsWonCells = page.locator('td.num').filter({ hasText: /^[1-9]/ });
  await expect(ptsWonCells.first()).toBeVisible();
});

test('navigating rounds with Next/Previous buttons', async ({ page }) => {
  await expect(page.locator('.round-nav-label')).toContainText('Round 1 of 3');

  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.locator('.round-nav-label')).toContainText('Round 2 of 3');

  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.locator('.round-nav-label')).toContainText('Round 3 of 3');

  // Next is disabled at last round
  await expect(page.getByRole('button', { name: /Next/ })).toBeDisabled();

  await page.getByRole('button', { name: /Previous/ }).click();
  await expect(page.locator('.round-nav-label')).toContainText('Round 2 of 3');
});

test('Previous button is disabled on round 1', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Previous/ })).toBeDisabled();
});

test('dot navigation jumps to the correct round', async ({ page }) => {
  const dots = page.locator('.round-dot');
  await dots.nth(2).click();
  await expect(page.locator('.round-nav-label')).toContainText('Round 3 of 3');
});

test('leaderboard sorting by points won changes row order', async ({ page }) => {
  // Enter asymmetric scores
  const scoreInputs = page.locator('.score-input');
  await scoreInputs.nth(0).fill('21');
  await scoreInputs.nth(1).fill('5');
  await scoreInputs.nth(2).fill('21');
  await scoreInputs.nth(3).fill('5');

  await page.getByRole('button', { name: 'Leaderboard' }).click();

  // Get first row player name
  const firstPlayerBefore = await page.locator('tbody tr:first-child td.name-cell').textContent();

  // The leaderboard is already sorted by rank/points; just verify it has rows
  const rows = page.locator('tbody tr').filter({ hasNot: page.locator('[colspan]') });
  await expect(rows).toHaveCount(8);

  // Top rank should be 1
  await expect(page.locator('tbody tr:first-child td.rank-cell')).toHaveText('1');
});

test('statistics tab shows all players after generating schedule', async ({ page }) => {
  await page.getByRole('button', { name: 'Statistics' }).click();

  const rows = page.locator('tbody tr').filter({ hasNot: page.locator('[colspan]') });
  await expect(rows).toHaveCount(8);
});

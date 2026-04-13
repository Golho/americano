import { test, expect } from '@playwright/test';
import { clearAppState } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
});

test('generate button is disabled without players or courts', async ({ page }) => {
  const generateBtn = page.getByRole('button', { name: 'GENERATE TOURNAMENT SCHEDULE' });
  await expect(generateBtn).toBeDisabled();
});

test('generate button is disabled with players but no courts', async ({ page }) => {
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  const generateBtn = page.getByRole('button', { name: 'GENERATE TOURNAMENT SCHEDULE' });
  await expect(generateBtn).toBeDisabled();
});

test('generate button is disabled with courts but no players', async ({ page }) => {
  await page.getByRole('button', { name: '2 courts', exact: true }).click();
  const generateBtn = page.getByRole('button', { name: 'GENERATE TOURNAMENT SCHEDULE' });
  await expect(generateBtn).toBeDisabled();
});

test('quick-fill buttons populate courts and players', async ({ page }) => {
  await page.getByRole('button', { name: '2 courts', exact: true }).click();
  await page.getByRole('button', { name: '8 players', exact: true }).click();

  // Courts section shows 2 tags
  const courtTags = page.locator('.card').filter({ hasText: 'Courts' }).locator('.player-tag');
  await expect(courtTags).toHaveCount(2);

  // Players section shows 8 visible tags (ignore the hidden x-show walk-ins list)
  const playerTags = page.locator('.players-card .player-tag').filter({ visible: true });
  await expect(playerTags).toHaveCount(8);
});

test('generating schedule switches to Schedule tab and shows match cards', async ({ page }) => {
  await page.getByRole('button', { name: '2 courts', exact: true }).click();
  await page.getByRole('button', { name: '8 players', exact: true }).click();
  await page.getByRole('button', { name: 'GENERATE TOURNAMENT SCHEDULE' }).click();

  await expect(page.locator('.match-card').first()).toBeVisible();
  await expect(page.locator('.round-nav-label')).toContainText('Round 1 of');
});

test('adding a player via text input shows them in the list', async ({ page }) => {
  const input = page.locator('input[placeholder="Player name…"]');
  await input.fill('Alice');
  await page.getByRole('button', { name: 'Add Player' }).click();

  await expect(page.locator('.players-card .player-tag').filter({ visible: true }).filter({ hasText: 'Alice' })).toBeVisible();
  await expect(input).toHaveValue('');
});

test('duplicate player name is silently rejected', async ({ page }) => {
  const input = page.locator('input[placeholder="Player name…"]');
  await input.fill('Alice');
  await page.getByRole('button', { name: 'Add Player' }).click();

  await input.fill('Alice');
  await page.getByRole('button', { name: 'Add Player' }).click();

  // Still only one Alice
  const aliceTags = page.locator('.players-card .player-tag').filter({ visible: true }).filter({ hasText: 'Alice' });
  await expect(aliceTags).toHaveCount(1);
});

test('clearing all players removes them from the list', async ({ page }) => {
  await page.getByRole('button', { name: '8 players', exact: true }).click();
  const playerTags = page.locator('.players-card .player-tag').filter({ visible: true });
  await expect(playerTags).toHaveCount(8);

  // There are two "Clear" buttons (courts and players); players Clear is last
  await page.getByRole('button', { name: 'Clear', exact: true }).last().click();

  await expect(playerTags).toHaveCount(0);
});

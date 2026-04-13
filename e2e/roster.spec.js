import { test, expect } from '@playwright/test';
import { clearAppState } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
});

test('CSV import with newline-separated names adds players to roster', async ({ page }) => {
  await page.getByRole('button', { name: 'Load Roster' }).click();

  const textarea = page.locator('#csvImportBox textarea');
  await expect(textarea).toBeVisible();

  await textarea.fill('Alice\nBob\nCarol\nDave');
  await page.locator('.btn-import').click();

  // Roster list should have 4 items
  const rosterItems = page.locator('.roster-item');
  await expect(rosterItems).toHaveCount(4);
  await expect(rosterItems.filter({ hasText: 'Alice' })).toHaveCount(1);
  await expect(rosterItems.filter({ hasText: 'Dave' })).toHaveCount(1);
});

test('CSV import with comma-separated names adds players to roster', async ({ page }) => {
  await page.getByRole('button', { name: 'Load Roster' }).click();

  const textarea = page.locator('#csvImportBox textarea');
  await textarea.fill('Eve, Frank, Grace, Hank');
  await page.locator('.btn-import').click();

  const rosterItems = page.locator('.roster-item');
  await expect(rosterItems).toHaveCount(4);
  await expect(rosterItems.filter({ hasText: 'Eve' })).toHaveCount(1);
});

test('toggling attendance marks player as not attending', async ({ page }) => {
  await page.getByRole('button', { name: 'Load Roster' }).click();
  const textarea = page.locator('#csvImportBox textarea');
  await textarea.fill('Alice\nBob\nCarol\nDave\nEve\nFrank');
  await page.locator('.btn-import').click();

  // All 6 should be attending initially
  const attendingCount = page.locator('.roster-item:not(.not-attending)');
  await expect(attendingCount).toHaveCount(6);

  // Uncheck Alice
  const aliceCheckbox = page.locator('.roster-item').filter({ hasText: 'Alice' }).locator('input[type="checkbox"]');
  await aliceCheckbox.uncheck();

  // Now 5 attending, Alice gets the not-attending class
  await expect(page.locator('.roster-item.not-attending')).toHaveCount(1);
  await expect(page.locator('.roster-item.not-attending')).toContainText('Alice');
});

test('non-attending player is excluded from generated schedule', async ({ page }) => {
  await page.getByRole('button', { name: 'Load Roster' }).click();
  const textarea = page.locator('#csvImportBox textarea');
  // 5 players so one will be excluded
  await textarea.fill('Alice\nBob\nCarol\nDave\nEve');
  await page.locator('.btn-import').click();

  // Mark Eve as not attending
  const eveCheckbox = page.locator('.roster-item').filter({ hasText: 'Eve' }).locator('input[type="checkbox"]');
  await eveCheckbox.uncheck();

  // Add a court
  await page.getByRole('button', { name: '2 courts' }).click();

  await page.getByRole('button', { name: 'GENERATE TOURNAMENT SCHEDULE' }).click();
  await page.waitForSelector('.match-card');

  // Info chip shows 4 players (Eve excluded)
  await expect(page.locator('.info-chip').filter({ hasText: 'Players:' })).toContainText('4');
});

test('cancelling CSV import hides the import box', async ({ page }) => {
  await page.getByRole('button', { name: 'Load Roster' }).click();
  await expect(page.locator('#csvImportBox')).toBeVisible();

  await page.locator('.btn-cancel').click();
  await expect(page.locator('#csvImportBox')).toBeHidden();
});

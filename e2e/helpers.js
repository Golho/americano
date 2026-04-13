/**
 * Clears all app state from localStorage and reloads to a clean slate.
 * Waits for Alpine.js to fully initialize before returning.
 */
export async function clearAppState(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Alpine evaluates :disabled on the generate button once initialized.
  // With 0 players and 0 courts this will be disabled — reliable init signal.
  await page.waitForSelector('.generate-btn[disabled]');
}

/**
 * Sets up a tournament from the Setup tab using quick-fill buttons, then
 * generates the schedule. Leaves the page on the Schedule tab.
 * @param {import('@playwright/test').Page} page
 * @param {{ courts?: number, players?: number, rounds?: number }} opts
 */
export async function quickSetup(page, { courts = 2, players = 8, rounds = 3 } = {}) {
  await page.getByRole('button', { name: `${courts} courts`, exact: true }).click();
  await page.getByRole('button', { name: `${players} players`, exact: true }).click();

  // Set rounds via the number input
  const roundsInput = page.locator('input[type="number"]');
  await roundsInput.fill(String(rounds));

  await page.getByRole('button', { name: 'GENERATE TOURNAMENT SCHEDULE' }).click();

  // generateSchedule() switches to the schedule tab and renders match cards
  await page.waitForSelector('.match-card');
}

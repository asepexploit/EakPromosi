import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the smoke suite. Expects:
 *   - apps/api running on API_URL (default http://localhost:4000)
 *   - apps/web running on WEB_URL (default http://localhost:5173)
 *   - a fresh Postgres with migrations applied + plans seed
 *
 * Run with: `pnpm --filter e2e test` (after `pnpm --filter e2e install:browsers`)
 * In CI the webServer block below boots the dev stack automatically.
 */
export default defineConfig({
  testDir: './smoke',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

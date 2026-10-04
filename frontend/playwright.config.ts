import { defineConfig, devices } from '@playwright/test';

// E2E targets are configurable so the same suite runs locally and in CI:
//   E2E_BASE_URL  the frontend       (default http://localhost:5173)
//   E2E_API_URL   the API under /api (default http://localhost:5000/api)
// Servers are started by the caller (see .github/workflows/ci.yml). Never point this at a database you care
// about, because the tests create real accounts.
export default defineConfig({
  testDir: './tests',
  // escrow.spec.ts predates the current UI (it drives an "Add Project" modal that no longer exists) and is
  // superseded by journey.spec.ts. Re-enable it only after porting it to the unified deal workspace.
  testIgnore: ['**/escrow.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

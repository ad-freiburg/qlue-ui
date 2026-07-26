import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:5174',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev servers before starting the tests.
   *
   * The frontend and backend deliberately use their own ports and never reuse an
   * existing server: both carry configuration the suite depends on (the fixture
   * endpoint list, and the proxy target that reaches it). Reusing a dev server
   * on the default ports silently swaps in the dev config, whose endpoint list
   * has no `test` slug, and the failure surfaces much later as a completion
   * widget that never opens. */
  webServer: [
    {
      command: 'cd ../frontend/ && npm run dev -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      env: { UI_API_TARGET: 'http://127.0.0.1:8001' },
      reuseExistingServer: false,
    },
    {
      command: 'cd ../backend/ && uv run uvicorn api.main:app --app-dir src/ --port 8001',
      url: 'http://127.0.0.1:8001/ui-api/health',
      env: { CONFIG_PATH: '../testing/fixtures/config.yaml' },
      reuseExistingServer: false,
    },
    {
      // Local SPARQL engine seeded with the test dataset, replacing the live
      // WWW endpoint the suite used to depend on.
      command: './fixtures/serve-sparql.sh',
      url: 'http://127.0.0.1:7878/',
      reuseExistingServer: !process.env.CI,
    },
  ],
});

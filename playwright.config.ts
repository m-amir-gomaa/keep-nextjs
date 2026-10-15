import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.NOTEWELD_BROWSER_URL || "http://localhost:3107";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60000,
  globalTimeout: 600000,
  reporter: process.env.CI
    ? [["list"], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "off", screenshot: "off", video: "off" }, // Never capture passphrases/recovery keys in CI artifacts.
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          chromiumSandbox: true,
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? {
                executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
              }
            : {}),
        },
      },
    },
  ],
  webServer: process.env.NOTEWELD_BROWSER_URL
    ? undefined
    : {
        command: "node scripts/isolated.mjs start",
        url: baseURL + "/auth/signin",
        reuseExistingServer: false,
        timeout: 90000,
      },
});

import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration (§3, §15).
 *
 * The suite drives the real application in a real browser, so it exercises the
 * canvas, the drag-and-drop and the routing that jsdom cannot. It starts its
 * own dev server unless one is already running.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:5173/quantum-foundations-lab/",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/quantum-foundations-lab/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

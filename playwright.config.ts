import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	use: {
		baseURL: "http://localhost:4173",
		trace: "on-first-retry",
		viewport: { width: 1280, height: 720 },
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],
	webServer: {
		command: "VITE_E2E=true pnpm build && pnpm preview",
		port: 4173,
		reuseExistingServer: !process.env.CI,
	},
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	// e2e/manual specs call page.pause() and would hang an unattended run.
	testIgnore: "**/manual/**",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	use: {
		baseURL: "http://localhost:4173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "pnpm build:e2e && pnpm preview",
		port: 4173,
		reuseExistingServer: !process.env.CI,
	},
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	// e2e/manual holds specs a human drives by hand — they call page.pause() and
	// ask you to physically switch the network. They would hang an unattended run.
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
		// build:e2e builds with --mode e2e, so Vite loads .env.e2e and the bundle
		// under test points at the local stack. Before this, the build used .env
		// and inlined the production project URL into the binary being tested.
		command: "pnpm build:e2e && pnpm preview",
		port: 4173,
		reuseExistingServer: !process.env.CI,
	},
});

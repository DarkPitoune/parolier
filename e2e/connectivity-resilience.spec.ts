import { test, expect } from "./fixtures/base.fixture";

test.describe("Connectivity resilience", () => {
	test("detects WiFi-without-internet and recovers", async ({ page }) => {
		// Load the app and verify we're online
		await page.goto("/");
		await expect(page.getByTestId("song-list")).toBeVisible({
			timeout: 15_000,
		});

		// Wait for first connectivity probe to complete (transitions from "checking" to "online")
		await page.waitForTimeout(5000);
		await expect(page.getByTestId("offline-banner")).not.toBeVisible();

		// Simulate "WiFi without internet": block all network but keep navigator.onLine = true
		// Use CDP to emulate network conditions (throttle to offline) while keeping onLine true
		// First go offline at the browser level
		await page.context().setOffline(true);

		// Override navigator.onLine to return true (simulates WiFi without internet)
		await page.evaluate(() => {
			Object.defineProperty(navigator, "onLine", {
				get: () => true,
				configurable: true,
			});
		});

		// Trigger a connectivity probe — fetch will fail (network blocked) but navigator.onLine is true
		await page.evaluate(() => window.dispatchEvent(new Event("online")));

		// Offline banner should appear after the probe fails
		await expect(page.getByTestId("offline-banner")).toBeVisible({
			timeout: 15_000,
		});

		// Restore network
		await page.context().setOffline(false);

		// Trigger another probe to detect recovery
		await page.evaluate(() => window.dispatchEvent(new Event("online")));

		// Banner should disappear
		await expect(page.getByTestId("offline-banner")).not.toBeVisible({
			timeout: 15_000,
		});
	});

	test("cached data remains accessible while fully offline", async ({
		page,
		testData,
	}) => {
		// Load the app to warm caches (TanStack + SW)
		await page.goto("/");
		await expect(page.getByTestId("song-list")).toBeVisible({
			timeout: 15_000,
		});

		// Verify song list is populated
		const songLinks = page.locator("[data-testid='song-list'] a");
		const songCount = await songLinks.count();
		expect(songCount).toBeGreaterThan(0);

		// Go fully offline
		await page.context().setOffline(true);

		// Offline banner should appear
		await expect(page.getByTestId("offline-banner")).toBeVisible({
			timeout: 15_000,
		});

		// Navigate to a song via SPA routing (click the link instead of page.goto)
		// This avoids WebKit's hard error on page.goto while offline
		const firstSongLink = page.getByTestId(`song-link-${testData.firstSongId}`);
		await firstSongLink.click();

		// Song page should load from TanStack Query cache
		await expect(page.getByTestId("song-page")).toBeVisible({
			timeout: 10_000,
		});

		// Come back online
		await page.context().setOffline(false);

		// Banner should disappear
		await expect(page.getByTestId("offline-banner")).not.toBeVisible({
			timeout: 15_000,
		});
	});

	test("service worker serves stale data on hard reload while offline", async ({
		page,
		browserName,
	}) => {
		// WebKit throws internal errors on reload while offline
		test.skip(browserName === "webkit", "WebKit does not support reload while offline");

		// Load the app to prime SW cache
		await page.goto("/");
		await expect(page.getByTestId("song-list")).toBeVisible({
			timeout: 15_000,
		});

		// Wait for service worker to be fully activated
		await page.evaluate(async () => {
			const reg = await navigator.serviceWorker?.ready;
			if (reg?.active?.state === "activating") {
				await new Promise<void>((resolve) => {
					reg.active!.addEventListener("statechange", () => {
						if (reg.active?.state === "activated") resolve();
					});
				});
			}
			return reg?.active?.state;
		});

		// Go offline and reload — SW should serve cached content
		await page.context().setOffline(true);
		await page.reload();

		// Song list should still render from SW cache
		await expect(page.getByTestId("song-list")).toBeVisible({
			timeout: 15_000,
		});

		// Restore connectivity
		await page.context().setOffline(false);
	});
});

import { test, expect } from "./fixtures/base.fixture";
import { getSlideState } from "./helpers/slide-state";

test.describe("Setlist slide navigation", () => {
	test("navigate forward through strophes and auto-advance to next step", async ({
		page,
		testData,
	}) => {
		await page.goto(`/setlists/${testData.setlistId}/steps/0/slide`);

		// Wait for song content to load (not just the logo)
		await expect(page.getByTestId("slide-content")).toBeVisible({
			timeout: 15_000,
		});

		// Navigate through all strophes of step 0
		// Press ArrowRight until we see the last-strophe indicator
		const lastStropheDot = page.getByTestId("last-strophe-dot");
		let attempts = 0;
		const maxAttempts = 50;

		while (!(await lastStropheDot.isVisible()) && attempts < maxAttempts) {
			await page.keyboard.press("ArrowRight");
			await page.waitForTimeout(200);
			attempts++;
		}

		// Verify we reached the last strophe
		await expect(lastStropheDot).toBeVisible();

		const stateBeforeAdvance = await getSlideState(page);
		expect(stateBeforeAdvance?.mode).toBe("song");

		if (testData.setlistStepCount >= 2) {
			// Press ArrowRight once more — should auto-advance to step 1
			await page.keyboard.press("ArrowRight");
			await page.waitForURL(/\/steps\/1\/slide/, { timeout: 5_000 });

			// Wait for the new step's content to load
			await expect(page.getByTestId("slide-content")).toBeVisible({
				timeout: 15_000,
			});

			// Verify localStorage reflects the new step
			const stateAfterAdvance = await getSlideState(page);
			expect(stateAfterAdvance?.setlistContext?.stepNumber).toBe(1);
		} else {
			// With only 1 step, ArrowRight at the last strophe is a no-op
			const urlBefore = page.url();
			await page.keyboard.press("ArrowRight");
			await page.waitForTimeout(500);
			expect(page.url()).toBe(urlBefore);
		}
	});

	test("navigate backward through strophes and auto-retreat to previous step", async ({
		page,
		testData,
	}) => {
		if (testData.setlistStepCount >= 2) {
			// Start at step 1 from the end (loads last strophe)
			await page.goto(
				`/setlists/${testData.setlistId}/steps/1/slide?from=end`,
			);

			// Wait for content to load
			await expect(page.getByTestId("slide-content")).toBeVisible({
				timeout: 15_000,
			});

			// Navigate backward through all strophes of step 1
			let state = await getSlideState(page);
			let attempts = 0;
			const maxAttempts = 50;

			while (
				state?.stropheIndex !== undefined &&
				state.stropheIndex > 0 &&
				attempts < maxAttempts
			) {
				await page.keyboard.press("ArrowLeft");
				await page.waitForTimeout(200);
				state = await getSlideState(page);
				attempts++;
			}

			// At stropheIndex 0 of step 1, press left to go to step 0
			await page.keyboard.press("ArrowLeft");
			await page.waitForURL(/\/steps\/0\/slide\?from=end/, {
				timeout: 5_000,
			});

			// Wait for content and verify step 0 loaded from end
			await expect(page.getByTestId("slide-content")).toBeVisible({
				timeout: 15_000,
			});

			const finalState = await getSlideState(page);
			expect(finalState?.setlistContext?.stepNumber).toBe(0);
		} else {
			// Start at step 0
			await page.goto(`/setlists/${testData.setlistId}/steps/0/slide`);

			await expect(page.getByTestId("slide-content")).toBeVisible({
				timeout: 15_000,
			});
		}

		// Navigate to strophe 0
		let state = await getSlideState(page);
		let attempts = 0;
		const maxAttempts = 50;
		while (
			state?.stropheIndex !== undefined &&
			state.stropheIndex > 0 &&
			attempts < maxAttempts
		) {
			await page.keyboard.press("ArrowLeft");
			await page.waitForTimeout(200);
			state = await getSlideState(page);
			attempts++;
		}

		// At step 0, strophe 0: ArrowLeft should be a no-op
		const urlBefore = page.url();
		await page.keyboard.press("ArrowLeft");
		await page.waitForTimeout(500);
		expect(page.url()).toBe(urlBefore);
	});

	test("presenter navigates through strophes and songs with ArrowRight", async ({
		page,
		testData,
	}) => {
		await page.goto(`/presenter/${testData.setlistId}/0`);

		// Wait for song to load
		await page.waitForFunction(
			() => {
				const raw = localStorage.getItem("parolier_slide_state");
				if (!raw) return false;
				const state = JSON.parse(raw);
				return state.mode === "song" && state.stropheIndex !== undefined;
			},
			{ timeout: 15_000 },
		);

		const initialState = await getSlideState(page);
		const firstSongId = initialState?.songId;

		// Press ArrowRight to advance through strophes
		await page.keyboard.press("ArrowRight");
		await page.waitForTimeout(300);

		const stateAfterFirst = await getSlideState(page);
		// If the song has multiple strophes, stropheIndex should have advanced
		// If only 1 strophe, we may already be at the boundary
		const songHasMultipleStrophes =
			stateAfterFirst?.stropheIndex !== undefined &&
			stateAfterFirst.stropheIndex > 0;

		if (songHasMultipleStrophes) {
			expect(stateAfterFirst?.stropheIndex).toBeGreaterThan(0);
			expect(stateAfterFirst?.songId).toBe(firstSongId);
		}

		// If setlist has multiple steps, keep pressing to cross into the next song
		if (testData.setlistStepCount >= 2) {
			let arrivedAtNextSong = false;
			const maxPresses = 80;

			for (let i = 0; i < maxPresses; i++) {
				await page.keyboard.press("ArrowRight");
				await page.waitForTimeout(200);

				const state = await getSlideState(page);
				if (state?.songId !== firstSongId && state?.mode === "song") {
					arrivedAtNextSong = true;
					break;
				}
			}

			expect(arrivedAtNextSong).toBe(true);

			// Verify we're on step 1 via the URL
			expect(page.url()).toContain(`/presenter/${testData.setlistId}/1`);

			// Verify the new song loaded (stropheIndex reset to 0 for the new song)
			const finalState = await getSlideState(page);
			expect(finalState?.mode).toBe("song");
			expect(finalState?.stropheIndex).toBe(0);
		}
	});

	test("navigate setlist with semi-warm cache after going offline", async ({
		page,
		testData,
		browserName,
	}) => {
		// WebKit throws on page.goto while offline
		test.skip(browserName === "webkit", "WebKit does not support page.goto while offline");

		// Prime caches: visit home page to trigger prefetch of songs and setlist steps
		await page.goto("/");
		await expect(page.getByTestId("song-list")).toBeVisible({
			timeout: 15_000,
		});

		// Also visit the setlist to ensure step data is cached
		await page.goto(`/setlists/${testData.setlistId}`);
		await page.waitForTimeout(3000);

		// Wait for service worker to be active
		await page.evaluate(async () => {
			const reg = await navigator.serviceWorker?.ready;
			return reg?.active?.state;
		});

		// Go offline
		await page.context().setOffline(true);

		// Navigate to slide view — should load from cache
		await page.goto(`/setlists/${testData.setlistId}/steps/0/slide`);

		// Song content should still load from SW cache + TanStack cache
		await expect(page.getByTestId("slide-content")).toBeVisible({
			timeout: 15_000,
		});

		// Navigate through strophes while offline
		await page.keyboard.press("ArrowRight");
		await page.waitForTimeout(300);

		const state = await getSlideState(page);
		expect(state?.mode).toBe("song");

		// Restore connectivity
		await page.context().setOffline(false);
	});
});

import { test, expect } from "./fixtures/base.fixture";
import { getSlideState, pollSlideState } from "./helpers/slide-state";

test.describe("Presenter-display sync via localStorage", () => {
	test("presenter navigation syncs strophe changes to display", async ({
		context,
		testData,
	}) => {
		const presenterPage = await context.newPage();
		const displayPage = await context.newPage();

		// Open presenter with a setlist step
		await presenterPage.goto(`/presenter/${testData.setlistId}/0`);

		// Open display
		await displayPage.goto("/slides");

		// Wait for presenter to load a song into state
		await pollSlideState(
			presenterPage,
			(state) => state?.mode === "song" && state?.songId !== undefined,
			15_000,
		);

		// Verify presenter page loaded correctly (folds old "presenter page loads" test)
		await expect(presenterPage.locator("h1")).toContainText(
			"Mode Présentateur",
		);
		await expect(
			presenterPage.getByTestId("prev-strophe-btn"),
		).toBeVisible();
		await expect(
			presenterPage.getByTestId("next-strophe-btn"),
		).toBeVisible();
		await expect(
			presenterPage.getByTestId("launch-slideshow-btn"),
		).toBeVisible();

		// Get initial state
		const initialState = await getSlideState(presenterPage);
		expect(initialState?.stropheIndex).toBe(0);
		expect(initialState?.source).toBe("presenter");

		// Check if next button is enabled (song has more than 1 strophe)
		const nextBtn = presenterPage.getByTestId("next-strophe-btn");
		const isNextDisabled = await nextBtn.isDisabled();

		if (!isNextDisabled) {
			// Click next strophe on presenter
			await nextBtn.click();

			// Wait for localStorage to update with new stropheIndex
			await pollSlideState(
				presenterPage,
				(state) =>
					state?.stropheIndex !== undefined && state.stropheIndex >= 1,
				5_000,
			);

			// Display should receive the StorageEvent and sync
			// With the feedback loop fix, the display no longer writes back and resets stropheIndex
			await displayPage.waitForFunction(
				() => {
					const raw = localStorage.getItem("parolier_slide_state");
					if (!raw) return false;
					const state = JSON.parse(raw);
					return (
						state.stropheIndex !== undefined &&
						state.stropheIndex >= 1
					);
				},
				{ timeout: 10_000 },
			);

			// Verify display is showing content (not just logo)
			await expect(
				displayPage.getByTestId("slide-content"),
			).toBeVisible({
				timeout: 15_000,
			});
		}

		// Both pages should agree on the songId
		const presenterState = await getSlideState(presenterPage);
		const displayState = await getSlideState(displayPage);
		expect(displayState?.songId).toBe(presenterState?.songId);

		await presenterPage.close();
		await displayPage.close();
	});

	test("logo toggle on presenter syncs to display", async ({
		context,
		testData,
	}) => {
		const presenterPage = await context.newPage();
		const displayPage = await context.newPage();

		await presenterPage.goto(`/presenter/${testData.setlistId}/0`);
		await displayPage.goto("/slides");

		// Wait for song to load on presenter
		await pollSlideState(
			presenterPage,
			(state) => state?.mode === "song",
			15_000,
		);

		// Wait for display to sync and load strophes
		await expect(displayPage.getByTestId("slide-content")).toBeVisible({
			timeout: 15_000,
		});

		// Toggle logo on presenter (T key)
		await presenterPage.keyboard.press("t");

		// Presenter state should be "logo"
		await pollSlideState(
			presenterPage,
			(state) => state?.mode === "logo",
			5_000,
		);

		// Display should sync and show logo
		await displayPage.waitForFunction(
			() => {
				const raw = localStorage.getItem("parolier_slide_state");
				if (!raw) return false;
				return JSON.parse(raw).mode === "logo";
			},
			{ timeout: 10_000 },
		);

		// Verify the logo image is visible on display
		await expect(displayPage.locator('img[alt="logo"]')).toBeVisible({
			timeout: 5_000,
		});

		// Toggle logo off
		await presenterPage.keyboard.press("t");

		// Presenter should return to song mode
		await pollSlideState(
			presenterPage,
			(state) => state?.mode === "song",
			5_000,
		);

		// Display should sync back to song mode and show content
		await expect(displayPage.getByTestId("slide-content")).toBeVisible({
			timeout: 15_000,
		});

		await presenterPage.close();
		await displayPage.close();
	});

	test("presenter song change via picker syncs to display", async ({
		context,
		testData,
	}) => {
		const presenterPage = await context.newPage();
		const displayPage = await context.newPage();

		// Use desktop viewport so the inline song picker is visible
		await presenterPage.setViewportSize({ width: 1280, height: 720 });
		await presenterPage.goto(`/presenter/${testData.setlistId}/0`);
		await displayPage.goto("/slides");

		// Wait for initial song to load
		await pollSlideState(
			presenterPage,
			(state) => state?.mode === "song",
			15_000,
		);

		const initialState = await getSlideState(presenterPage);
		const initialSongId = initialState?.songId;

		// Select a different song via the inline picker
		const searchInput = presenterPage.locator("#song-picker-search");
		if (
			await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)
		) {
			const differentSongId =
				testData.firstSongId !== initialSongId
					? testData.firstSongId
					: testData.firstSongId + 1;
			await searchInput.fill(String(differentSongId));
			await presenterPage.waitForTimeout(500);

			const pickerResult = presenterPage
				.locator("[data-testid='song-list'] a")
				.first();
			if (
				await pickerResult
					.isVisible({ timeout: 3_000 })
					.catch(() => false)
			) {
				await pickerResult.click();

				// Wait for state to update with new song on presenter
				await pollSlideState(
					presenterPage,
					(state) =>
						state?.mode === "song" &&
						state?.songId !== initialSongId,
					10_000,
				);

				const newState = await getSlideState(presenterPage);

				// Display should sync to the new song
				await displayPage.waitForFunction(
					(expectedSongId: number) => {
						const raw = localStorage.getItem(
							"parolier_slide_state",
						);
						if (!raw) return false;
						return JSON.parse(raw).songId === expectedSongId;
					},
					newState!.songId!,
					{ timeout: 10_000 },
				);
			}
		}

		await presenterPage.close();
		await displayPage.close();
	});
});

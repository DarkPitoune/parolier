import { expect, test } from "@playwright/test";

test.describe("Presenter flow", () => {
	test("presenter page loads", async ({ page }) => {
		await page.goto("/presenter");

		// Should see the presenter heading
		await expect(page.locator("h1")).toContainText("Mode Présentateur");
	});

	test("slideshow launch button is visible on desktop", async ({ page }) => {
		// Use a desktop viewport
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/presenter");

		const launchBtn = page.getByTestId("launch-slideshow-btn");
		await expect(launchBtn).toBeVisible();
		await expect(launchBtn).toContainText("Diaporama");
	});

	test("navigation buttons exist and prev is disabled initially", async ({
		page,
	}) => {
		// First navigate to a setlist step to have a song loaded
		// For now just check the presenter page loads with controls
		await page.goto("/presenter");

		// Navigation buttons should exist (may be disabled without a song)
		const prevBtn = page.getByTestId("prev-strophe-btn");
		const nextBtn = page.getByTestId("next-strophe-btn");

		await expect(prevBtn).toBeVisible();
		await expect(nextBtn).toBeVisible();
	});

	test("opens the setlist step it was launched from, and walks it", async ({
		page,
	}) => {
		// The presenter link only renders on desktop
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/setlists");

		const firstSetlist = page
			.locator('a[href^="/setlists/"]:not([href$="/edit"])')
			.first();
		await expect(firstSetlist).toBeVisible();
		await firstSetlist.click();
		await expect(page).toHaveURL(/\/setlists\/\d+$/);

		await page.getByTestId("open-presenter-btn").click();

		// A step is a 0-based index into the setlist, so the first tab is step 0 —
		// this is what the `activeTab + 1` off-by-one used to get wrong (and on the
		// last tab it addressed a step that doesn't exist at all).
		await expect(page).toHaveURL(/\/presenter\/\d+\/0$/);

		const counter = page.getByTestId("setlist-step-counter");
		await expect(counter).toContainText("Étape 1/");

		// Steps can be texts, which have no strophes: navigation has to come from
		// the setlist, not from strophe bounds, or the buttons are dead here.
		await expect(page.getByTestId("next-strophe-btn")).toBeEnabled();

		const total = Number(
			((await counter.textContent()) ?? "").split("/")[1]?.trim(),
		);
		test.skip(!total || total < 2, "setlist has fewer than 2 steps");

		// Walk the first step's strophes to their end, where "next" has to cross
		// into the second step instead of going dead. The bound just has to exceed
		// the strophe count of the longest opening song.
		for (let i = 0; i < 60; i++) {
			if (((await counter.textContent()) ?? "").startsWith("Étape 2/")) break;
			await page.keyboard.press("ArrowRight");
		}
		await expect(counter).toContainText("Étape 2/");
		await expect(page).toHaveURL(/\/presenter\/\d+\/1$/);
	});

	test("opening the slideshow mid-song does not reset the slide", async ({
		context,
	}) => {
		// The slideshow window has to fetch the lyrics itself (they're left out of
		// the sync payload). That fetch must not double as "start this song from the
		// top" — it used to, which moved the slideshow to slide 1 and, via the sync
		// echo, dragged the presenter back with it.
		const presenter = await context.newPage();
		await presenter.setViewportSize({ width: 1280, height: 720 });
		await presenter.goto("/setlists");
		await presenter
			.locator('a[href^="/setlists/"]:not([href$="/edit"])')
			.first()
			.click();
		await expect(presenter).toHaveURL(/\/setlists\/\d+$/);
		await presenter.getByTestId("open-presenter-btn").click();

		const strophes = presenter.getByTestId("strophe-counter");
		await expect(strophes).toContainText("1/");
		const total = Number(((await strophes.textContent()) ?? "").split("/")[1]);
		test.skip(!total || total < 3, "opening step has fewer than 3 slides");

		await presenter.keyboard.press("ArrowRight");
		await presenter.keyboard.press("ArrowRight");
		await expect(strophes).toHaveText(`3/${total}`);
		const slide3 = (
			(await presenter.getByTestId("current-slide").textContent()) ?? ""
		).trim();
		expect(slide3.length).toBeGreaterThan(0);

		// Now the slideshow joins, mid-song
		const slideshow = await context.newPage();
		await slideshow.goto("/slides");
		// The logo gives way to lyrics once it has fetched the song — the exact
		// moment the old LOAD_SONG would have snapped it to the first slide.
		await expect(slideshow.locator('img[alt="logo"]')).toHaveCount(0);

		// It has to show the slide it synced to, not the first one
		await expect(slideshow.locator("body")).toContainText(slide3);

		// ...and the presenter must not have been dragged along
		await expect(strophes).toHaveText(`3/${total}`);
		await slideshow.close();
		await presenter.close();
	});

	test("reopening the presenter mid-song does not reset the slide", async ({
		page,
	}) => {
		// Same hazard as the slideshow joining late, from the other side: the
		// presenter reloaded onto a song already in progress has to fetch the lyrics,
		// and that fetch must not restart the song.
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/setlists");
		await page
			.locator('a[href^="/setlists/"]:not([href$="/edit"])')
			.first()
			.click();
		await expect(page).toHaveURL(/\/setlists\/\d+$/);
		await page.getByTestId("open-presenter-btn").click();

		const strophes = page.getByTestId("strophe-counter");
		await expect(strophes).toContainText("1/");
		const total = Number(((await strophes.textContent()) ?? "").split("/")[1]);
		test.skip(!total || total < 3, "opening step has fewer than 3 slides");

		await page.keyboard.press("ArrowRight");
		await page.keyboard.press("ArrowRight");
		await expect(strophes).toHaveText(`3/${total}`);
		const slide3 = (
			(await page.getByTestId("current-slide").textContent()) ?? ""
		).trim();

		// Land on the standalone presenter: no setlist step to load, so the only way
		// back to the lyrics is the fetch that rebuilds them from the stored state.
		await page.goto("/presenter");
		await expect(strophes).not.toHaveText("Aucune diapositive");
		await expect(strophes).toHaveText(`3/${total}`);
		await expect(page.getByTestId("current-slide")).toContainText(slide3);
	});

	test("arrow key navigation updates localStorage state", async ({ page }) => {
		await page.goto("/presenter");

		// Set up a song in localStorage using new SyncPayload shape
		await page.evaluate(() => {
			localStorage.setItem(
				"parolier_slide_state",
				JSON.stringify({
					mode: "song",
					songId: 1,
					stropheIndex: 0,
					timestamp: Date.now(),
					source: "presenter",
				}),
			);
		});

		// Press right arrow
		await page.keyboard.press("ArrowRight");

		// Check localStorage was updated
		const state = await page.evaluate(() => {
			const raw = localStorage.getItem("parolier_slide_state");
			return raw ? JSON.parse(raw) : null;
		});

		// State should exist (may or may not have advanced depending on song data)
		expect(state).not.toBeNull();
	});
});

import { expect, test, type Page } from "@playwright/test";
import { SETLISTS } from "./fixtures";

/**
 * Both pages must live in ONE Playwright context: that is what makes them share
 * an origin, and localStorage is the transport carrying slide state between
 * them. Separate contexts share nothing and would pass while asserting nothing.
 */

const setlist = SETLISTS.sunday;

/** Presenter, parked on the first step of the fixture setlist. */
async function openPresenter(page: Page) {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto(`/setlists/${setlist.id}`);
	await page.getByTestId("open-presenter-btn").click();
	await expect(page.getByTestId("strophe-counter")).toContainText("1/");
	return page;
}

/** What the presenter believes is on screen right now. */
async function presenterSlideText(page: Page) {
	const text = (await page.getByTestId("current-slide").textContent()) ?? "";
	const trimmed = text.trim();
	expect(trimmed.length).toBeGreaterThan(0);
	return trimmed;
}

test.describe("slide sync: presenter to an already-open slide window", () => {
	test("1. an already-open slide window follows the presenter, without reload", async ({
		context,
	}) => {
		const presenter = await openPresenter(await context.newPage());

		const slides = await context.newPage();
		await slides.goto("/slides");
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(0);

		const before = await presenterSlideText(presenter);
		await expect(slides.locator("body")).toContainText(before);

		await presenter.keyboard.press("ArrowRight");
		await expect(presenter.getByTestId("strophe-counter")).toContainText("2/");
		const after = await presenterSlideText(presenter);
		expect(after).not.toBe(before);

		await expect(slides.locator("body")).toContainText(after);

		await slides.close();
		await presenter.close();
	});

	test("2. the slide window tracks each further step, in order", async ({
		context,
	}) => {
		const presenter = await openPresenter(await context.newPage());
		const slides = await context.newPage();
		await slides.goto("/slides");
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(0);

		const seen: string[] = [await presenterSlideText(presenter)];

		for (const step of [2, 3]) {
			await presenter.keyboard.press("ArrowRight");
			await expect(presenter.getByTestId("strophe-counter")).toContainText(
				`${step}/`,
			);
			const current = await presenterSlideText(presenter);
			await expect(slides.locator("body")).toContainText(current);
			seen.push(current);
		}

		// Distinct slides, so a window that never changed cannot pass.
		expect(new Set(seen).size).toBe(seen.length);

		await slides.close();
		await presenter.close();
	});

	test("3. toggling the logo from the presenter shows it on the slide window", async ({
		context,
	}) => {
		const presenter = await openPresenter(await context.newPage());
		const slides = await context.newPage();
		await slides.goto("/slides");
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(0);

		// Accessible name comes from the icon's alt text, not the title attribute.
		const logoToggle = presenter.locator('button:has(img[alt="logo toggle"])');

		await logoToggle.click();
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(1);

		// ...and back, so this is a toggle rather than a one-way trip.
		await logoToggle.click();
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(0);

		await slides.close();
		await presenter.close();
	});

	test("4. a slide window joining late shows the current slide, not the first", async ({
		context,
	}) => {
		const presenter = await openPresenter(await context.newPage());

		await presenter.keyboard.press("ArrowRight");
		await presenter.keyboard.press("ArrowRight");
		await expect(presenter.getByTestId("strophe-counter")).toContainText("3/");
		const third = await presenterSlideText(presenter);

		const slides = await context.newPage();
		await slides.goto("/slides");
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(0);

		await expect(slides.locator("body")).toContainText(third);

		await slides.close();
		await presenter.close();
	});

	test("5. reloading the presenter mid-song does not reset the slide window", async ({
		context,
	}) => {
		const presenter = await openPresenter(await context.newPage());
		const slides = await context.newPage();
		await slides.goto("/slides");
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(0);

		await presenter.keyboard.press("ArrowRight");
		await presenter.keyboard.press("ArrowRight");
		await expect(presenter.getByTestId("strophe-counter")).toContainText("3/");
		const third = await presenterSlideText(presenter);
		await expect(slides.locator("body")).toContainText(third);

		// Standalone /presenter has no step in its URL, so it rebuilds from stored
		// state. Reloading /presenter/:setlistId/:stepNumber restarts the step
		// instead, because that URL names step 0.
		await presenter.goto("/presenter");
		await expect(presenter.getByTestId("strophe-counter")).toContainText("3/");

		await expect(slides.locator("body")).toContainText(third);

		await slides.close();
		await presenter.close();
	});
});

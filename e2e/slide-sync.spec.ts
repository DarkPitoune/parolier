import { expect, test, type Page } from "@playwright/test";
import { SETLISTS } from "./fixtures";

/**
 * PLAN-01 1.6a — the transport contract.
 *
 * This is the behaviour Phase 3 must preserve when MQTT is replaced. Nothing
 * covered it before: the presenter specs open /slides *after* advancing, so they
 * only exercise mount-time hydration, and the unit tests fire a synthetic
 * StorageEvent at `window`, which exercises the handler rather than real
 * cross-tab delivery.
 *
 * Both pages live in ONE Playwright context on purpose — that is what makes
 * them share an origin and therefore localStorage, which is the transport
 * actually under test here. Two contexts would share nothing and, with the MQTT
 * broker unreachable, would silently assert nothing at all.
 *
 * These pass today with the broker at 192.168.8.1 unreachable. That is the
 * point: it proves the same-device path owes MQTT nothing, which is what makes
 * the swap safe. They must still pass afterwards, unchanged — if one needs
 * editing to go green, the swap changed behaviour.
 *
 * The sixth assertion of this contract — that a display-role action does not
 * reach another device — cannot be written here. It needs a second device,
 * which is the leg MQTT carries and localStorage does not. It belongs to Phase
 * 3.1, against the new transport's mock.
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

		// The slide window opens BEFORE the advance. This is the whole difference
		// from the existing specs, which open it after and so only ever test
		// hydration on mount.
		const slides = await context.newPage();
		await slides.goto("/slides");
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(0);

		const before = await presenterSlideText(presenter);
		await expect(slides.locator("body")).toContainText(before);

		await presenter.keyboard.press("ArrowRight");
		await expect(presenter.getByTestId("strophe-counter")).toContainText("2/");
		const after = await presenterSlideText(presenter);
		expect(after).not.toBe(before);

		// No reload anywhere: the open window has to move on its own.
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

		// Each step was a distinct slide, so "it followed" cannot be satisfied by
		// a window that simply never changed.
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

		// The button's accessible name comes from its icon's alt text, not its title.
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

		// Only now does the display join.
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
		// The presenter-only half of this lives in presenter-flow.spec.ts; this is
		// the two-window form the contract actually describes.
		const presenter = await openPresenter(await context.newPage());
		const slides = await context.newPage();
		await slides.goto("/slides");
		await expect(slides.locator('img[alt="logo"]')).toHaveCount(0);

		await presenter.keyboard.press("ArrowRight");
		await presenter.keyboard.press("ArrowRight");
		await expect(presenter.getByTestId("strophe-counter")).toContainText("3/");
		const third = await presenterSlideText(presenter);
		await expect(slides.locator("body")).toContainText(third);

		// Land on the standalone presenter, which is the case this contract means:
		// it has no step in its URL, so the only way back to the lyrics is the
		// stored state. Reloading /presenter/:setlistId/:stepNumber instead is a
		// different thing and correctly restarts the step — that URL names step 0,
		// so mounting it dispatches LOAD_SONG and the slide window follows it back
		// to the first verse, as it should.
		await presenter.goto("/presenter");
		await expect(presenter.getByTestId("strophe-counter")).toContainText("3/");

		// The display must still be on the slide it was on — a reload is not a
		// reason for the congregation's screen to jump back to the first verse.
		await expect(slides.locator("body")).toContainText(third);

		await slides.close();
		await presenter.close();
	});
});

import { expect, test, type Locator, type Page } from "@playwright/test";
import { SETLISTS, SONGS } from "./fixtures";

/**
 * Find a form input by the value it is currently showing. These are React
 * controlled inputs, so the value lives on the property and not on a `value`
 * attribute — a CSS attribute selector finds nothing.
 */
async function inputMatching(
	page: Page,
	matches: (value: string) => boolean,
	description: string,
): Promise<Locator> {
	const inputs = page.locator("input");
	let index = -1;
	// Polls rather than scanning once: the editor form arrives with the query, so
	// a single pass straight after navigation reads a page of empty inputs.
	await expect
		.poll(
			async () => {
				const count = await inputs.count();
				for (let i = 0; i < count; i++) {
					if (matches(await inputs.nth(i).inputValue())) {
						index = i;
						return true;
					}
				}
				return false;
			},
			{ message: `no input ${description}`, timeout: 10_000 },
		)
		.toBe(true);
	return inputs.nth(index);
}

const inputShowing = (page: Page, value: string) =>
	inputMatching(page, (v) => v === value, `showing ${JSON.stringify(value)}`);

/**
 * PLAN-01 1.6d — the flows a cleanup could plausibly break.
 *
 * Phases 2 and 3 delete pages, dependencies, service-worker cache entries and a
 * whole transport. None of that is supposed to touch these, which is exactly
 * why they need to be observable before the deleting starts.
 */

const song = SONGS.withChords;

test.describe("song list and back", () => {
	test("list to song page and back to the list", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByTestId("song-list")).toBeVisible();

		await page.getByTestId(`song-link-${song.id}`).click();
		await expect(page.getByTestId("song-page")).toBeVisible();
		await expect(page.locator("h1").first()).toContainText(song.title);

		await page.goBack();
		await expect(page.getByTestId("song-list")).toBeVisible();
		// The list is still populated, not an empty shell served from a stale cache.
		await expect(page.getByTestId(`song-link-${song.id}`)).toBeVisible();
	});
});

test.describe("chord transposition", () => {
	// The fixture's first line carries Em. Transposing has to move it and come
	// back to exactly Em — "changed" alone would pass for a control that mangles
	// the chord, and the reset button is the part people actually rely on.
	const chordCell = (page: Page) =>
		page.getByTestId("song-page").getByText("Em", { exact: true }).first();

	test("up, down, and back to the original key", async ({ page }) => {
		await page.goto(`/songs/${song.id}`);
		await expect(page.getByTestId("song-page")).toBeVisible();
		await expect(chordCell(page)).toBeVisible();

		await page.locator('img[alt="Menu"]').click();
		// Transposition lives in the panel's settings tab; it opens on Navigation.
		await page.getByRole("button", { name: "Préférences" }).click();
		const transpose = page.locator('[aria-label="tonality choice"]');
		await expect(transpose).toBeVisible();
		const up = transpose.locator("button").nth(1);
		const down = transpose.locator("button").nth(0);
		const reset = transpose.locator("button").nth(2);

		await up.click();
		await expect(page.getByTestId("song-page").getByText("Em", { exact: true })).toHaveCount(0);
		await expect(page.getByTestId("song-page").getByText("Fm", { exact: true }).first()).toBeVisible();

		await down.click();
		await expect(chordCell(page)).toBeVisible();

		// And the reset path, from the other direction.
		await down.click();
		await expect(page.getByTestId("song-page").getByText("Em", { exact: true })).toHaveCount(0);
		await reset.click();
		await expect(chordCell(page)).toBeVisible();
	});
});

test.describe("walking a setlist", () => {
	test("steps through the fixture setlist in order", async ({ page }) => {
		const setlist = SETLISTS.sunday;
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto(`/setlists/${setlist.id}`);
		await page.getByTestId("open-presenter-btn").click();

		const step = page.getByTestId("setlist-step-counter");
		await expect(step).toContainText(`Étape 1/${setlist.steps}`);

		// Walk to the end of step 1's strophes and across the boundary. The bound
		// only has to exceed the opening song's slide count.
		for (let i = 0; i < 60; i++) {
			if (((await step.textContent()) ?? "").startsWith("Étape 2/")) break;
			await page.keyboard.press("ArrowRight");
		}
		await expect(step).toContainText(`Étape 2/${setlist.steps}`);

		// Step 3 of this fixture is a text, which has no strophes at all —
		// navigation has to come from the setlist or the buttons go dead here.
		for (let i = 0; i < 60; i++) {
			if (((await step.textContent()) ?? "").startsWith("Étape 3/")) break;
			await page.keyboard.press("ArrowRight");
		}
		await expect(step).toContainText(`Étape 3/${setlist.steps}`);
	});
});

test.describe("song editor round-trip", () => {
	test("edit a line, save, reload, the change is still there", async ({
		page,
	}) => {
		// A song of its own: this spec writes, the suite runs fullyParallel, and a
		// writer must not share a row with a reader.
		const draft = SONGS.editable;
		// Every fixture value for this row starts "Ligne ", which is what makes the
		// prefix match below safe.
		const edited = `Ligne modifiée ${Date.now()}`;

		const save = async () => {
			await page.getByRole("button", { name: "Enregistrer" }).click();
			// The write is a mutation; navigating before it resolves loses it, which
			// is exactly what made the first version of this test flaky.
			await expect(page.getByText("Modifications enregistrées")).toBeVisible();
		};

		await page.goto(`/songs/${draft.id}/edit`);
		// Matched by prefix, not by exact text: if an earlier run failed between
		// its write and its restore, this row still holds that run's value, and a
		// write-test that poisons every later run is worse than no test.
		await (
			await inputMatching(
				page,
				(v) => v.startsWith("Ligne "),
				"holding this song's lyric line",
			)
		).fill(edited);
		await save();

		// Reload rather than trusting the page we are on: the assertion is about
		// what was persisted, not what is sitting in the query cache.
		await page.goto(`/songs/${draft.id}`);
		await page.reload();
		await expect(page.getByTestId("song-page")).toContainText(edited);

		// Put it back, so a second local run starts where this one did.
		await page.goto(`/songs/${draft.id}/edit`);
		await (await inputShowing(page, edited)).fill(draft.firstLine);
		await save();
		await page.goto(`/songs/${draft.id}`);
		await page.reload();
		await expect(page.getByTestId("song-page")).toContainText(draft.firstLine);
	});
});

test.describe("search", () => {
	test("finds a fixture song by title", async ({ page }) => {
		// searchOnly is deliberately in no setlist, so finding it proves search
		// reaches the corpus rather than some recently-touched subset.
		const target = SONGS.searchOnly;
		await page.goto("/");
		await expect(page.getByTestId("song-list")).toBeVisible();

		await page.locator('input[type="search"]').fill("Souffle");

		await expect(page.getByTestId(`song-link-${target.id}`)).toBeVisible();
		await expect(page.getByTestId(`song-link-${song.id}`)).toHaveCount(0);
	});
});

import { expect, test, type Locator, type Page } from "@playwright/test";
import { SETLISTS, SONGS } from "./fixtures";

/**
 * Editor inputs are React-controlled, so their value lives on the property and
 * no attribute selector matches them. Polls because the form is populated by a
 * query, not by the document.
 */
async function inputMatching(
	page: Page,
	matches: (value: string) => boolean,
	description: string,
): Promise<Locator> {
	const inputs = page.locator("input");
	let index = -1;
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
		await expect(page.getByTestId(`song-link-${song.id}`)).toBeVisible();
	});
});

test.describe("chord transposition", () => {
	const chordCell = (page: Page) =>
		page.getByTestId("song-page").getByText("Em", { exact: true }).first();

	test("up, down, and back to the original key", async ({ page }) => {
		await page.goto(`/songs/${song.id}`);
		await expect(page.getByTestId("song-page")).toBeVisible();
		await expect(chordCell(page)).toBeVisible();

		await page.locator('img[alt="Menu"]').click();
		// Transposition lives in the settings tab; the panel opens on Navigation.
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

		for (let i = 0; i < 60; i++) {
			if (((await step.textContent()) ?? "").startsWith("Étape 2/")) break;
			await page.keyboard.press("ArrowRight");
		}
		await expect(step).toContainText(`Étape 2/${setlist.steps}`);

		// Step 3 is a text and has no strophes, so navigation must come from the
		// setlist rather than from strophe bounds.
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
		const draft = SONGS.editable;
		const edited = `Ligne modifiée ${Date.now()}`;

		const save = async () => {
			await page.getByRole("button", { name: "Enregistrer" }).click();
			// Navigating before the mutation resolves loses the write.
			await expect(page.getByText("Modifications enregistrées")).toBeVisible();
		};

		await page.goto(`/songs/${draft.id}/edit`);
		// Prefix match, so a run that failed between its write and its restore
		// leaves this row still findable.
		await (
			await inputMatching(
				page,
				(v) => v.startsWith("Ligne "),
				"holding this song's lyric line",
			)
		).fill(edited);
		await save();

		// Reload so this asserts what was persisted, not the query cache.
		await page.goto(`/songs/${draft.id}`);
		await page.reload();
		await expect(page.getByTestId("song-page")).toContainText(edited);

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
		// In no setlist, so finding it proves search reaches the whole corpus.
		const target = SONGS.searchOnly;
		await page.goto("/");
		await expect(page.getByTestId("song-list")).toBeVisible();

		await page.locator('input[type="search"]').fill("Souffle");

		await expect(page.getByTestId(`song-link-${target.id}`)).toBeVisible();
		await expect(page.getByTestId(`song-link-${song.id}`)).toHaveCount(0);
	});
});

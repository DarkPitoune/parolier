import { expect, test, type Page, type Route } from "@playwright/test";
import { SONGS } from "./fixtures";

const THEME = "La confiance";

const SUGGESTION = {
	success: true,
	summary: "Une veillée pour s'abandonner avec confiance.",
	items: [
		{
			slot: "louange",
			songId: SONGS.withChords.id,
			reasoning: "Ouvre la soirée.",
			alternatives: [SONGS.long.id],
		},
		{
			slot: "louange",
			songId: SONGS.withSection.id,
			reasoning: "",
			alternatives: [],
		},
		{
			slot: "esprit",
			songId: SONGS.searchOnly.id,
			reasoning: "",
			alternatives: [],
		},
		{ slot: "marie", songId: SONGS.withNote.id, reasoning: "", alternatives: [] },
	],
};

const REFINEMENT = {
	success: true,
	reply: "J'ai retiré Peuple de lumière.",
	ops: [
		{ op: "remove", key: `song-${SONGS.withSection.id}` },
		{ op: "replace", key: "song-999999", songId: SONGS.editable.id },
	],
};

const fulfill = (route: Route, status: number, body: unknown) =>
	route.fulfill({
		status,
		contentType: "application/json",
		headers: { "Access-Control-Allow-Origin": "*" },
		body: JSON.stringify(body),
	});

/** Replaces the edge function, so no model is called and answers are fixed. */
async function stubAssistant(page: Page, failFirstSuggestion = false) {
	let suggestCalls = 0;
	await page.route("**/functions/v1/suggest-veillee", (route) => {
		if (route.request().method() === "OPTIONS") {
			return route.fulfill({
				status: 200,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Headers": "*",
				},
			});
		}
		if (route.request().postDataJSON()?.mode === "refine") {
			return fulfill(route, 200, REFINEMENT);
		}
		suggestCalls++;
		if (failFirstSuggestion && suggestCalls === 1) {
			return fulfill(route, 500, { success: false, error: "Mistral down" });
		}
		return fulfill(route, 200, SUGGESTION);
	});
}

async function answerBrief(page: Page) {
	await page.goto("/setlists");
	await page.getByRole("link", { name: "Préparer une veillée" }).click();
	await expect(page).toHaveURL(/\/veillees\/new$/);

	await page.getByPlaceholder("La confiance, le désert, la joie…").fill(THEME);
	await page.keyboard.press("Enter");
	await page.getByRole("button", { name: "30 min" }).click();
	// Adoration, then Marie.
	await page.getByRole("button", { name: "Non", exact: true }).click();
	await page.getByRole("button", { name: "Oui", exact: true }).click();
}

const draftRow = (page: Page, title: string) =>
	page.getByRole("listitem").filter({ hasText: title });

test.describe("veillée assistant", () => {
	// The service worker answers setlist reads NetworkFirst from its cache, which
	// can hide the setlist this spec just created.
	test.use({ serviceWorkers: "block" });

	test("drafts, refines and saves a veillée", async ({ page }) => {
		await stubAssistant(page);
		await answerBrief(page);

		await expect(page.getByText(SUGGESTION.summary)).toBeVisible();
		for (const song of [
			SONGS.withChords,
			SONGS.withSection,
			SONGS.searchOnly,
			SONGS.withNote,
		]) {
			await expect(draftRow(page, song.title)).toBeVisible();
		}

		await draftRow(page, SONGS.withChords.title)
			.getByRole("button", { name: "Remplacer" })
			.click();
		await page.getByRole("menuitem", { name: SONGS.long.title }).click();
		await expect(draftRow(page, SONGS.long.title)).toBeVisible();
		await expect(draftRow(page, SONGS.withChords.title)).toHaveCount(0);

		await page
			.getByPlaceholder("Plus calme avant l'Esprit Saint, remplace…")
			.fill("Retire Peuple de lumière");
		await page.keyboard.press("Enter");
		await expect(page.getByText(REFINEMENT.reply)).toBeVisible();
		await expect(
			page.getByText("Remplacement : ce chant n'est pas dans la setlist"),
		).toBeVisible();
		await expect(draftRow(page, SONGS.withSection.title)).toHaveCount(0);

		await page.getByRole("button", { name: "Annuler" }).click();
		await expect(draftRow(page, SONGS.withSection.title)).toBeVisible();

		await page.getByRole("button", { name: "Créer la setlist" }).click();
		await expect(page).toHaveURL(/\/setlists\/\d+\/edit$/);
		const setlistId = page.url().match(/\/setlists\/(\d+)\/edit$/)?.[1];

		await page.goto(`/setlists/${setlistId}`);
		await expect(page.getByText(SONGS.long.title).first()).toBeVisible();
		await expect(page.getByText(SONGS.withNote.title).first()).toBeVisible();

		await page.goto("/setlists");
		const link = page.locator(`a[href="/setlists/${setlistId}"]`);
		await page
			.locator("div", { has: link })
			.last()
			.getByRole("button")
			.click();
		await page.getByRole("button", { name: "Supprimer" }).click();
		await expect(link).toHaveCount(0);
	});

	test("shows the function's error and keeps the answers for a retry", async ({
		page,
	}) => {
		await stubAssistant(page, true);
		await answerBrief(page);

		await expect(page.getByText("Mistral down")).toBeVisible();
		await page.getByRole("button", { name: "Réessayer" }).click();
		await expect(page.getByText(SUGGESTION.summary)).toBeVisible();
		await expect(draftRow(page, SONGS.withNote.title)).toBeVisible();
		await expect(page.getByRole("button", { name: THEME })).toBeVisible();
	});
});

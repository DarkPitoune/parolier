import { expect, type Page, test } from "@playwright/test";
import { SONGS } from "./fixtures";

async function pickLanguage(page: Page, name: string) {
	await page.locator('img[alt="Menu"]').click();
	await page.getByRole("button", { name: "Préférences" }).click();
	await page
		.locator('[aria-label="song language choice"]')
		.getByRole("button", { name })
		.click();
	await page.keyboard.press("Escape");
}

test.describe("English songs and translations", () => {
	test("switching the language in Préférences moves the open song to its translation", async ({
		page,
	}) => {
		const { translatedFr, translatedEn } = SONGS;
		await page.goto(`/songs/${translatedFr.id}`);
		await expect(page.getByTestId("song-page")).toBeVisible();

		await pickLanguage(page, "English");
		await expect(page).toHaveURL(`/songs/${translatedEn.id}`);

		await pickLanguage(page, "Français");
		await expect(page).toHaveURL(`/songs/${translatedFr.id}`);
	});

	test("a song with no translation offers to link or create one", async ({
		page,
	}) => {
		await page.goto(`/songs/${SONGS.englishOnly.id}`);
		const missing = page.getByTestId("missing-translation");
		await expect(missing.getByRole("button", { name: "Lier une traduction" })).toBeVisible();
		await expect(missing.getByRole("button", { name: "Créer le chant traduit" })).toBeVisible();
		await expect(page).toHaveURL(`/songs/${SONGS.englishOnly.id}`);

		await pickLanguage(page, "English");
		await expect(missing).toHaveCount(0);
	});

	test("the language setting filters the list", async ({ page }) => {
		await page.goto("/");
		const list = page.getByTestId("song-list");
		const english = list.getByTestId(`song-link-${SONGS.englishOnly.id}`);
		const french = list.getByTestId(`song-link-${SONGS.withChords.id}`);
		await expect(french).toBeVisible();
		await expect(english).toHaveCount(0);

		await pickLanguage(page, "English");
		await expect(english).toBeVisible();
		await expect(french).toHaveCount(0);

		await pickLanguage(page, "Français");
		await expect(french).toBeVisible();
	});

	test("link a translation from the editor, then unlink it", async ({ page }) => {
		const { linkSourceEn, linkTargetFr, translatedFr } = SONGS;
		await page.goto(`/songs/${linkSourceEn.id}/edit`);
		const translation = page.getByTestId("translation");

		await translation.getByRole("button", { name: "Lier une traduction" }).click();
		await expect(page.locator(`#song-${linkTargetFr.id}`)).toBeVisible();
		// Other language only, and never a song that already has a translation.
		await expect(page.locator(`#song-${SONGS.englishOnly.id}`)).toHaveCount(0);
		await expect(page.locator(`#song-${translatedFr.id}`)).toHaveCount(0);
		await page.getByPlaceholder("Tapez un chant ici").fill(linkTargetFr.title);
		await page.keyboard.press("Enter");

		await expect(
			translation.getByRole("link", { name: linkTargetFr.title }),
		).toBeVisible();
		await expect(
			translation.getByRole("button", { name: "Lier une traduction" }),
		).toHaveCount(0);

		await translation
			.getByRole("button", { name: `Délier « ${linkTargetFr.title} »` })
			.click();
		await expect(
			translation.getByRole("button", { name: "Lier une traduction" }),
		).toBeVisible();
	});

	test("create the translated song from the editor", async ({ page }) => {
		page.once("dialog", (dialog) => dialog.accept("Holy draft"));
		await page.goto(`/songs/${SONGS.createSourceEn.id}/edit`);
		const translation = page.getByTestId("translation");
		await expect(translation).toBeVisible();
		// A previous run against the same database left it translated.
		const unlink = translation.getByRole("button", { name: /^Délier/ });
		if (await unlink.count()) await unlink.click();

		await translation
			.getByRole("button", { name: "Créer le chant traduit" })
			.click();

		await expect(page).toHaveURL(/\/songs\/\d+\/edit$/);
		await expect(page).not.toHaveURL(`/songs/${SONGS.createSourceEn.id}/edit`);
		await expect(
			page
				.getByTestId("translation")
				.getByRole("link", { name: SONGS.createSourceEn.title }),
		).toBeVisible();
	});
});

import { expect, test } from "@playwright/test";
import { SONGS } from "./fixtures";

const song = SONGS.withChords;

test.describe("Song navigation", () => {
	test("homepage lists the fixture songs and navigates into one", async ({
		page,
	}) => {
		await page.goto("/");

		const songList = page.getByTestId("song-list");
		await expect(songList).toBeVisible();

		// Named, not `.first()`: this asserts the list rendered *this* song rather
		// than merely rendering something.
		const link = page.getByTestId(`song-link-${song.id}`);
		await expect(link).toBeVisible();
		await expect(link).toContainText(song.title);

		await link.click();

		await expect(page).toHaveURL(new RegExp(`/songs/${song.id}$`));
		await expect(page.getByTestId("song-page")).toBeVisible();
	});

	test("song page shows the fixture song's title", async ({ page }) => {
		await page.goto(`/songs/${song.id}`);

		await expect(page.getByTestId("song-page")).toBeVisible();
		await expect(page.locator("h1").first()).toContainText(song.title);
	});
});

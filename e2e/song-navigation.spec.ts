import { test, expect } from "@playwright/test";

test.describe("Song navigation", () => {
	test("homepage shows song list and navigating to a song works", async ({
		page,
	}) => {
		await page.goto("/");

		// Song list should be visible
		const songList = page.getByTestId("song-list");
		await expect(songList).toBeVisible();

		// Should have at least one song link
		const firstLink = songList.locator("a").first();
		await expect(firstLink).toBeVisible();

		// Click the first song
		await firstLink.click();

		// Should navigate to /songs/:id
		await expect(page).toHaveURL(/\/songs\/\d+/);

		// Song page should render
		await expect(page.getByTestId("song-page")).toBeVisible();
	});

	test("song page shows title", async ({ page }) => {
		await page.goto("/");

		const songList = page.getByTestId("song-list");
		const firstLink = songList.locator("a").first();
		await firstLink.click();
		await expect(page.getByTestId("song-page")).toBeVisible();

		// Page should contain an h1 with content
		const heading = page.locator("h1");
		await expect(heading.first()).toBeVisible();
	});
});

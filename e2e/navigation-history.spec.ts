import { test, expect } from "@playwright/test";

test.describe("Navigation history", () => {
	test("visited song appears in navigation panel recents", async ({
		page,
	}) => {
		// 1. Go to homepage, click first song
		await page.goto("/");
		const firstSong = page.getByTestId("song-list").locator("a").first();
		await firstSong.click();
		await expect(page.getByTestId("song-page")).toBeVisible();

		// 2. Get the title as stored in history from localStorage
		const historyAfterVisit = await page.evaluate(() =>
			JSON.parse(localStorage.getItem("navigationHistory") || "[]"),
		);
		expect(historyAfterVisit.length).toBe(1);
		const entryTitle = historyAfterVisit[0].title;

		// 3. Go back to homepage via browser back
		await page.goBack();
		await expect(page.getByTestId("song-list")).toBeVisible();

		// 4. Open nav panel (click logo)
		await page.locator('img[alt="Logo"]').click();

		// 5. Verify "Récents" section contains the song
		await expect(page.getByText("Récents")).toBeVisible();
		const recentBtn = page.getByRole("button", {
			name: entryTitle,
		});
		await expect(recentBtn).toBeVisible();

		// 6. Click the recent entry, verify navigation back to the song
		await recentBtn.click();
		await expect(page).toHaveURL(/\/songs\/\d+/);
		await expect(page.getByTestId("song-page")).toBeVisible();
	});

	test("scroll position is saved and restored via recents", async ({
		page,
	}) => {
		// 1. Navigate to a song page
		await page.goto("/");
		const firstSong = page.getByTestId("song-list").locator("a").first();
		await firstSong.click();
		await expect(page.getByTestId("song-page")).toBeVisible();

		// 2. Scroll down on the song page
		await page.evaluate(() => window.scrollTo(0, 300));
		await page.waitForTimeout(100);

		// 3. Navigate away via browser back (triggers React unmount -> scroll save)
		await page.goBack();
		await expect(page.getByTestId("song-list")).toBeVisible();

		// 4. Check localStorage: the history entry should have scrollY ~ 300
		const history = await page.evaluate(() =>
			JSON.parse(localStorage.getItem("navigationHistory") || "[]"),
		);
		expect(history.length).toBeGreaterThan(0);
		expect(history[0].scrollY).toBeGreaterThanOrEqual(200);

		// 5. Open nav panel and click the recent entry
		await page.locator('img[alt="Logo"]').click();
		await page.getByText("Récents").waitFor();
		const recentBtn = page
			.locator("button", { has: page.locator(".truncate") })
			.first();
		await recentBtn.click();

		// 6. Verify scroll was restored (check after a short delay for rAF)
		await page.waitForTimeout(500);
		const scrollY = await page.evaluate(() => window.scrollY);
		expect(scrollY).toBeGreaterThanOrEqual(200);
	});
});

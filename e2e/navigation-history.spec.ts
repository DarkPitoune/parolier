import { expect, test } from "@playwright/test";
import { SONGS } from "./fixtures";

const song = SONGS.withChords;
// Scroll restore needs a page taller than the viewport.
const longSong = SONGS.long;

test.describe("Navigation history", () => {
	test("visited song appears in navigation panel recents", async ({
		page,
	}) => {
		// 1. Go to homepage, open a named fixture song
		await page.goto("/");
		await page.getByTestId(`song-link-${song.id}`).click();
		await expect(page.getByTestId("song-page")).toBeVisible();

		// 2. Get the title as stored in history from localStorage
		const historyAfterVisit = await page.evaluate(() =>
			JSON.parse(localStorage.getItem("navigationHistory") || "[]"),
		);
		expect(historyAfterVisit.length).toBe(1);
		const entryTitle = historyAfterVisit[0].title;
		// The fixture makes this checkable: history stored the song we opened.
		expect(entryTitle).toContain(song.title);

		// 3. Go back to homepage via browser back
		await page.goBack();
		await expect(page.getByTestId("song-list")).toBeVisible();

		// 4. Open nav panel (click logo)
		await page.locator('img[alt="Menu"]').click();

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

	// KNOWN BROKEN — the assertions below are correct and are left intact; the
	// feature is what does not work. useNavigationHistory saves the scroll offset
	// in an effect cleanup (useNavigationHistory.ts:63), which React runs after the
	// outgoing page's DOM is already gone: measured at that moment,
	// document.scrollHeight has collapsed to the viewport height and the browser has
	// already clamped window.scrollY to 0. So every entry is stored with scrollY: 0
	// and "Récents" always returns you to the top.
	//
	// Not caused by the fixtures: the test asserts the page really scrolled to 300
	// before navigating, and that assertion passes. Not caused by React Router's
	// <ScrollRestoration /> either — removing it changes nothing. The likely fix is
	// to track the offset as it changes (a scroll listener into a ref) and save the
	// last known value, rather than reading it during teardown.
	//
	// Found by pointing this spec at a deterministic fixture; it went unnoticed
	// because nothing has ever run the e2e suite (PLAN-00 §3, "no CI").
	test.fixme("scroll position is saved and restored via recents", async ({
		page,
	}) => {
		// 1. Navigate to the tall fixture song
		await page.goto("/");
		await page.getByTestId(`song-link-${longSong.id}`).click();
		await expect(page.getByTestId("song-page")).toBeVisible();

		// 2. Scroll down on the song page. Assert it actually moved: on a page
		// shorter than the viewport scrollTo is a no-op, and the restore assertion
		// below would then be checking nothing.
		await page.evaluate(() => window.scrollTo(0, 300));
		await page.waitForTimeout(100);
		expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(200);

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
		await page.locator('img[alt="Menu"]').click();
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

import { test as base, expect, type Page } from "@playwright/test";

type TestData = {
	setlistId: string;
	setlistStepCount: number;
	firstSongId: number;
};

async function discoverTestData(page: Page): Promise<TestData> {
	// Discover the setlist with the most steps
	await page.goto("/setlists");
	const setlistLinks = page.locator("a[href^='/setlists/']");
	await expect(setlistLinks.first()).toBeVisible({ timeout: 15_000 });
	const allHrefs = await setlistLinks.evaluateAll((els) =>
		els.map((el) => el.getAttribute("href")),
	);
	const setlistIds = [
		...new Set(
			allHrefs
				.filter(Boolean)
				.map((h) => h!.split("/setlists/")[1].split("/")[0]),
		),
	];

	let bestSetlistId = setlistIds[0];
	let bestStepCount = 0;

	for (const id of setlistIds) {
		await page.goto(`/setlists/${id}`);
		const tabContainer = page.locator("[style*='scrollbar-width']");
		const firstTab = tabContainer.locator("button").first();
		const visible = await firstTab
			.isVisible({ timeout: 5_000 })
			.catch(() => false);
		const count = visible
			? await tabContainer.locator("button").count()
			: 0;
		if (count > bestStepCount) {
			bestStepCount = count;
			bestSetlistId = id;
		}
	}

	const setlistId = bestSetlistId;
	const stepCount = bestStepCount;

	// Discover a song from the main list
	await page.goto("/");
	const songList = page.getByTestId("song-list");
	await expect(songList).toBeVisible({ timeout: 15_000 });
	const songLink = songList.locator("a[href^='/songs/']").first();
	await expect(songLink).toBeVisible();
	const songHref = await songLink.getAttribute("href");
	const firstSongId = Number(songHref!.split("/songs/")[1]);

	return { setlistId, setlistStepCount: stepCount, firstSongId };
}

export const test = base.extend<{ testData: TestData }>({
	testData: async ({ page }, use) => {
		const data = await discoverTestData(page);
		await use(data);
	},
});

export { expect };

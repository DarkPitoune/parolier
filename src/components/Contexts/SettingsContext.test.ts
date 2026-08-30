import { createStore } from "jotai";
import { DEFAULT_FONT_SIZE, FONT_SIZES } from "./SettingsContext";

const STORAGE_KEY = "settings.fontSize";

/**
 * The atom reads storage once, as it is created, so each case needs a fresh
 * module — which is also the only way to cover the very first frame.
 */
async function sizeSeenWith(stored?: number) {
	if (stored === undefined) localStorage.removeItem(STORAGE_KEY);
	else localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
	vi.resetModules();
	const { fontSizeAtom } = await import("./SettingsContext");
	return createStore().get(fontSizeAtom);
}

describe("font size", () => {
	test("falls back to the default with nothing stored", async () => {
		expect(await sizeSeenWith()).toBe(DEFAULT_FONT_SIZE);
	});

	test("keeps the three offered sizes untouched", async () => {
		for (const size of FONT_SIZES) {
			expect(await sizeSeenWith(size)).toBe(size);
		}
	});

	test("snaps every position the old ten-step picker could store", async () => {
		const [normal, big, huge] = FONT_SIZES;
		const seen = [];
		for (let stored = 0; stored <= 9; stored++) {
			seen.push(await sizeSeenWith(stored));
		}
		expect(seen).toEqual([
			normal,
			normal,
			normal,
			normal,
			big,
			big,
			big,
			huge,
			huge,
			huge,
		]);
	});

	test("writing keeps the stored value in the scale", async () => {
		await sizeSeenWith();
		const { fontSizeAtom } = await import("./SettingsContext");
		const store = createStore();

		store.set(fontSizeAtom, FONT_SIZES[2]);

		expect(store.get(fontSizeAtom)).toBe(FONT_SIZES[2]);
		expect(localStorage.getItem(STORAGE_KEY)).toBe(String(FONT_SIZES[2]));
	});
});

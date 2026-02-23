import type { Page } from "@playwright/test";

type SlideMode = "idle" | "song" | "logo" | "text";

export type SlideStatePayload = {
	mode: SlideMode;
	songId?: number;
	stropheIndex?: number;
	textTitle?: string;
	setlistContext?: {
		setlistId: string;
		stepNumber: number;
		totalSteps: number;
	};
	stropheContent?: unknown[];
	timestamp: number;
	source: "presenter" | "display";
};

const SLIDE_STATE_KEY = "parolier_slide_state";

export async function getSlideState(
	page: Page,
): Promise<SlideStatePayload | null> {
	return page.evaluate((key) => {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	}, SLIDE_STATE_KEY);
}

export async function waitForSlideState(
	page: Page,
	predicate: (state: SlideStatePayload) => boolean,
	timeout = 10_000,
): Promise<SlideStatePayload> {
	const handle = await page.waitForFunction(
		({ key, predicateStr }) => {
			const raw = localStorage.getItem(key);
			if (!raw) return null;
			const state = JSON.parse(raw);
			const fn = new Function("state", `return (${predicateStr})(state)`);
			return fn() ? state : null;
		},
		{ key: SLIDE_STATE_KEY, predicateStr: predicate.toString() },
		{ timeout },
	);
	return handle.jsonValue() as Promise<SlideStatePayload>;
}

/**
 * Wait for a specific slide state condition using polling.
 * Simpler alternative to waitForSlideState that avoids eval.
 */
export async function pollSlideState(
	page: Page,
	check: (state: SlideStatePayload | null) => boolean,
	timeout = 10_000,
): Promise<SlideStatePayload | null> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const state = await getSlideState(page);
		if (check(state)) return state;
		await page.waitForTimeout(200);
	}
	throw new Error(`Slide state condition not met within ${timeout}ms`);
}

export async function clearSlideState(page: Page): Promise<void> {
	await page.evaluate((key) => {
		localStorage.removeItem(key);
	}, SLIDE_STATE_KEY);
}

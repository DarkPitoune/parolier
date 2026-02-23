import type { Strophe } from "@/assets/types";
import {
	INITIAL_STATE,
	type SetlistContext,
	type SlideState,
	type SyncPayload,
	deserializeState,
	getSetlistNavAction,
	serializeState,
	slideReducer,
} from "./slideReducer";

const makeLine = (text: string) => ({ text, chords: "" });
const makeVerse = (lines: string[]): Strophe => ({
	type: "verse",
	content: lines.map(makeLine),
	repetition: false,
});

const strophes3: Strophe[] = [
	makeVerse(["Line 1"]),
	makeVerse(["Line 2"]),
	makeVerse(["Line 3"]),
];

const setlistCtx: SetlistContext = {
	setlistId: "sl-1",
	stepNumber: 2,
	totalSteps: 5,
};

const songState = (
	overrides: Partial<Extract<SlideState, { mode: "song" }>> = {},
): Extract<SlideState, { mode: "song" }> => ({
	mode: "song",
	songId: 1,
	stropheIndex: 0,
	strophes: strophes3,
	setlistContext: null,
	...overrides,
});

describe("slideReducer", () => {
	describe("initial state", () => {
		it("defaults to idle", () => {
			expect(INITIAL_STATE).toEqual({ mode: "idle" });
		});
	});

	describe("LOAD_SONG", () => {
		it("from idle → song mode", () => {
			const result = slideReducer(INITIAL_STATE, {
				type: "LOAD_SONG",
				songId: 42,
				strophes: strophes3,
			});
			expect(result).toEqual({
				mode: "song",
				songId: 42,
				stropheIndex: 0,
				strophes: strophes3,
				setlistContext: null,
			});
		});

		it("from song → song (different song) resets stropheIndex", () => {
			const state = songState({ songId: 1, stropheIndex: 2 });
			const result = slideReducer(state, {
				type: "LOAD_SONG",
				songId: 99,
				strophes: strophes3,
			});
			expect(result).toMatchObject({
				mode: "song",
				songId: 99,
				stropheIndex: 0,
			});
		});

		it("from song → song (same songId) still resets stropheIndex", () => {
			const state = songState({ songId: 42, stropheIndex: 2 });
			const result = slideReducer(state, {
				type: "LOAD_SONG",
				songId: 42,
				strophes: strophes3,
			});
			expect(result).toMatchObject({
				mode: "song",
				songId: 42,
				stropheIndex: 0,
			});
		});

		it("from logo → song", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 2,
				strophes: strophes3,
				setlistContext: null,
			};
			const result = slideReducer(state, {
				type: "LOAD_SONG",
				songId: 5,
				strophes: strophes3,
			});
			expect(result.mode).toBe("song");
		});

		it("from text → song", () => {
			const state: SlideState = {
				mode: "text",
				textTitle: "Test",
				setlistContext: setlistCtx,
			};
			const result = slideReducer(state, {
				type: "LOAD_SONG",
				songId: 5,
				strophes: strophes3,
			});
			expect(result.mode).toBe("song");
		});

		it("stores setlistContext when provided", () => {
			const result = slideReducer(INITIAL_STATE, {
				type: "LOAD_SONG",
				songId: 1,
				strophes: strophes3,
				setlistContext: setlistCtx,
			});
			expect(result).toMatchObject({ setlistContext: setlistCtx });
		});

		it("setlistContext is null when not provided", () => {
			const result = slideReducer(INITIAL_STATE, {
				type: "LOAD_SONG",
				songId: 1,
				strophes: strophes3,
			});
			expect(result).toMatchObject({ setlistContext: null });
		});

		it("handles empty strophes array", () => {
			const result = slideReducer(INITIAL_STATE, {
				type: "LOAD_SONG",
				songId: 1,
				strophes: [],
			});
			expect(result).toMatchObject({
				mode: "song",
				strophes: [],
				stropheIndex: 0,
			});
		});
	});

	describe("LOAD_TEXT", () => {
		it("from any mode → text mode", () => {
			const result = slideReducer(INITIAL_STATE, {
				type: "LOAD_TEXT",
				textTitle: "Psaume 23",
				setlistContext: setlistCtx,
			});
			expect(result).toEqual({
				mode: "text",
				textTitle: "Psaume 23",
				setlistContext: setlistCtx,
			});
		});

		it("from song → text", () => {
			const result = slideReducer(songState(), {
				type: "LOAD_TEXT",
				textTitle: "Title",
				setlistContext: setlistCtx,
			});
			expect(result.mode).toBe("text");
		});
	});

	describe("HYDRATE_STROPHES", () => {
		it("populates strophes in song mode without changing stropheIndex", () => {
			const state = songState({ strophes: [], stropheIndex: 2 });
			const result = slideReducer(state, {
				type: "HYDRATE_STROPHES",
				strophes: strophes3,
			});
			expect(result).toMatchObject({
				mode: "song",
				stropheIndex: 2,
				strophes: strophes3,
			});
		});

		it("populates strophes in logo mode without changing mode", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 1,
				strophes: [],
				setlistContext: null,
			};
			const result = slideReducer(state, {
				type: "HYDRATE_STROPHES",
				strophes: strophes3,
			});
			expect(result).toMatchObject({
				mode: "logo",
				stropheIndex: 1,
				strophes: strophes3,
			});
		});

		it("no-op in text mode", () => {
			const state: SlideState = {
				mode: "text",
				textTitle: "T",
				setlistContext: setlistCtx,
			};
			const result = slideReducer(state, {
				type: "HYDRATE_STROPHES",
				strophes: strophes3,
			});
			expect(result).toEqual(state);
		});

		it("no-op in idle mode", () => {
			const result = slideReducer(INITIAL_STATE, {
				type: "HYDRATE_STROPHES",
				strophes: strophes3,
			});
			expect(result).toEqual(INITIAL_STATE);
		});
	});

	describe("NEXT_STROPHE", () => {
		it("increments stropheIndex in song mode", () => {
			const state = songState();
			const result = slideReducer(state, { type: "NEXT_STROPHE" });
			expect(result).toMatchObject({ stropheIndex: 1 });
		});

		it("clamps at last strophe", () => {
			const state = songState({ stropheIndex: 2 });
			const result = slideReducer(state, { type: "NEXT_STROPHE" });
			expect(result).toMatchObject({ stropheIndex: 2 });
		});

		it("no-op in idle mode", () => {
			const result = slideReducer(INITIAL_STATE, { type: "NEXT_STROPHE" });
			expect(result).toEqual(INITIAL_STATE);
		});

		it("in logo mode with song: exits logo and advances strophe", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 0,
				strophes: strophes3,
				setlistContext: null,
			};
			const result = slideReducer(state, { type: "NEXT_STROPHE" });
			expect(result).toMatchObject({
				mode: "song",
				songId: 1,
				stropheIndex: 1,
			});
		});

		it("in logo mode without song: no-op", () => {
			const state: SlideState = {
				mode: "logo",
				songId: null,
				stropheIndex: 0,
				strophes: [],
				setlistContext: null,
			};
			const result = slideReducer(state, { type: "NEXT_STROPHE" });
			expect(result).toEqual(state);
		});

		it("no-op in text mode", () => {
			const state: SlideState = {
				mode: "text",
				textTitle: "T",
				setlistContext: setlistCtx,
			};
			const result = slideReducer(state, { type: "NEXT_STROPHE" });
			expect(result).toEqual(state);
		});

		it("handles empty strophes array", () => {
			const state = songState({ strophes: [], stropheIndex: 0 });
			const result = slideReducer(state, { type: "NEXT_STROPHE" });
			expect(result).toMatchObject({ stropheIndex: 0 });
		});
	});

	describe("PREV_STROPHE", () => {
		it("decrements stropheIndex", () => {
			const state = songState({ stropheIndex: 2 });
			const result = slideReducer(state, { type: "PREV_STROPHE" });
			expect(result).toMatchObject({ stropheIndex: 1 });
		});

		it("clamps at 0", () => {
			const state = songState({ stropheIndex: 0 });
			const result = slideReducer(state, { type: "PREV_STROPHE" });
			expect(result).toMatchObject({ stropheIndex: 0 });
		});

		it("no-op in idle mode", () => {
			const result = slideReducer(INITIAL_STATE, { type: "PREV_STROPHE" });
			expect(result).toEqual(INITIAL_STATE);
		});

		it("in logo mode with song: exits logo and decrements strophe", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 1,
				strophes: strophes3,
				setlistContext: null,
			};
			const result = slideReducer(state, { type: "PREV_STROPHE" });
			expect(result).toMatchObject({
				mode: "song",
				songId: 1,
				stropheIndex: 0,
			});
		});

		it("in logo mode without song: no-op", () => {
			const state: SlideState = {
				mode: "logo",
				songId: null,
				stropheIndex: 0,
				strophes: [],
				setlistContext: null,
			};
			const result = slideReducer(state, { type: "PREV_STROPHE" });
			expect(result).toEqual(state);
		});
	});

	describe("GOTO_STROPHE", () => {
		it("jumps to exact index", () => {
			const state = songState();
			const result = slideReducer(state, {
				type: "GOTO_STROPHE",
				stropheIndex: 2,
			});
			expect(result).toMatchObject({ stropheIndex: 2 });
		});

		it("clamps to valid range (upper)", () => {
			const state = songState();
			const result = slideReducer(state, {
				type: "GOTO_STROPHE",
				stropheIndex: 100,
			});
			expect(result).toMatchObject({ stropheIndex: 2 });
		});

		it("clamps to valid range (lower)", () => {
			const state = songState({ stropheIndex: 2 });
			const result = slideReducer(state, {
				type: "GOTO_STROPHE",
				stropheIndex: -5,
			});
			expect(result).toMatchObject({ stropheIndex: 0 });
		});

		it("no-op in non-song mode", () => {
			const result = slideReducer(INITIAL_STATE, {
				type: "GOTO_STROPHE",
				stropheIndex: 1,
			});
			expect(result).toEqual(INITIAL_STATE);
		});
	});

	describe("TOGGLE_LOGO", () => {
		it("from song → logo preserves song data", () => {
			const state = songState({ stropheIndex: 2 });
			const result = slideReducer(state, { type: "TOGGLE_LOGO" });
			expect(result).toEqual({
				mode: "logo",
				songId: 1,
				stropheIndex: 2,
				strophes: strophes3,
				setlistContext: null,
			});
		});

		it("from logo (with song) → song restores data", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 2,
				strophes: strophes3,
				setlistContext: null,
			};
			const result = slideReducer(state, { type: "TOGGLE_LOGO" });
			expect(result).toEqual({
				mode: "song",
				songId: 1,
				stropheIndex: 2,
				strophes: strophes3,
				setlistContext: null,
			});
		});

		it("from logo (no song) → idle", () => {
			const state: SlideState = {
				mode: "logo",
				songId: null,
				stropheIndex: 0,
				strophes: [],
				setlistContext: null,
			};
			const result = slideReducer(state, { type: "TOGGLE_LOGO" });
			expect(result).toEqual(INITIAL_STATE);
		});

		it("from idle → logo with songId=null", () => {
			const result = slideReducer(INITIAL_STATE, { type: "TOGGLE_LOGO" });
			expect(result).toEqual({
				mode: "logo",
				songId: null,
				stropheIndex: 0,
				strophes: [],
				setlistContext: null,
			});
		});

		it("from text → logo preserves setlistContext", () => {
			const state: SlideState = {
				mode: "text",
				textTitle: "T",
				setlistContext: setlistCtx,
			};
			const result = slideReducer(state, { type: "TOGGLE_LOGO" });
			expect(result).toMatchObject({
				mode: "logo",
				songId: null,
				setlistContext: setlistCtx,
			});
		});

		it("double toggle returns to original state", () => {
			const state = songState({ stropheIndex: 2 });
			const toggled = slideReducer(state, { type: "TOGGLE_LOGO" });
			const restored = slideReducer(toggled, { type: "TOGGLE_LOGO" });
			expect(restored).toEqual(state);
		});
	});

	describe("GO_IDLE", () => {
		it("from any mode → idle", () => {
			expect(slideReducer(songState(), { type: "GO_IDLE" })).toEqual(
				INITIAL_STATE,
			);
			expect(
				slideReducer(
					{
						mode: "text",
						textTitle: "T",
						setlistContext: setlistCtx,
					},
					{ type: "GO_IDLE" },
				),
			).toEqual(INITIAL_STATE);
			expect(
				slideReducer(
					{
						mode: "logo",
						songId: 1,
						stropheIndex: 0,
						strophes: [],
						setlistContext: null,
					},
					{ type: "GO_IDLE" },
				),
			).toEqual(INITIAL_STATE);
		});
	});

	describe("SYNC", () => {
		it("replaces state from payload", () => {
			const payload: SyncPayload = {
				mode: "song",
				songId: 42,
				stropheIndex: 3,
				timestamp: Date.now(),
				source: "presenter",
			};
			const result = slideReducer(INITIAL_STATE, {
				type: "SYNC",
				payload,
			});
			expect(result).toMatchObject({
				mode: "song",
				songId: 42,
				stropheIndex: 3,
				strophes: [], // Not serialized
			});
		});

		it("sets mode correctly from payload", () => {
			const payload: SyncPayload = {
				mode: "logo",
				songId: 5,
				stropheIndex: 1,
				timestamp: Date.now(),
				source: "display",
			};
			const result = slideReducer(songState(), {
				type: "SYNC",
				payload,
			});
			expect(result.mode).toBe("logo");
		});
	});
});

describe("serializeState", () => {
	it("serializes song mode with strophe content", () => {
		const state = songState();
		const payload = serializeState(state, "presenter");
		expect(payload).toMatchObject({
			mode: "song",
			songId: 1,
			stropheIndex: 0,
			source: "presenter",
		});
		expect(payload.stropheContent).toBeDefined();
		expect(payload.timestamp).toBeGreaterThan(0);
	});

	it("serializes idle mode minimally", () => {
		const payload = serializeState(INITIAL_STATE, "display");
		expect(payload).toMatchObject({
			mode: "idle",
			source: "display",
		});
		expect(payload.songId).toBeUndefined();
	});

	it("serializes text mode", () => {
		const state: SlideState = {
			mode: "text",
			textTitle: "Psaume",
			setlistContext: setlistCtx,
		};
		const payload = serializeState(state, "presenter");
		expect(payload).toMatchObject({
			mode: "text",
			textTitle: "Psaume",
			setlistContext: setlistCtx,
		});
	});
});

describe("deserializeState", () => {
	it("deserializes song mode (strophes empty)", () => {
		const payload: SyncPayload = {
			mode: "song",
			songId: 42,
			stropheIndex: 3,
			timestamp: Date.now(),
			source: "presenter",
		};
		const state = deserializeState(payload);
		expect(state).toMatchObject({
			mode: "song",
			songId: 42,
			stropheIndex: 3,
			strophes: [],
		});
	});

	it("falls back to idle if song payload has no songId", () => {
		const payload: SyncPayload = {
			mode: "song",
			timestamp: Date.now(),
			source: "presenter",
		};
		expect(deserializeState(payload)).toEqual(INITIAL_STATE);
	});

	it("falls back to idle if text payload is incomplete", () => {
		const payload: SyncPayload = {
			mode: "text",
			timestamp: Date.now(),
			source: "presenter",
		};
		expect(deserializeState(payload)).toEqual(INITIAL_STATE);
	});

	it("deserializes idle mode", () => {
		const payload: SyncPayload = {
			mode: "idle",
			timestamp: Date.now(),
			source: "display",
		};
		expect(deserializeState(payload)).toEqual(INITIAL_STATE);
	});
});

describe("getSetlistNavAction", () => {
	const setlist = { id: "sl-1", step: "2", length: 5 };

	describe("next direction", () => {
		it("dispatches NEXT_STROPHE when not at last strophe", () => {
			const state = songState({ stropheIndex: 0 });
			expect(
				getSetlistNavAction(
					"next",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("dispatch");
		});

		it("navigates to next step at last strophe in setlist", () => {
			const state = songState({ stropheIndex: 2 }); // last of 3
			expect(
				getSetlistNavAction(
					"next",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("next_step");
		});

		it("does nothing at last strophe when not in setlist", () => {
			const state = songState({ stropheIndex: 2 });
			expect(getSetlistNavAction("next", state, undefined, undefined, 0)).toBe(
				"none",
			);
		});

		it("does nothing at last strophe of last setlist step", () => {
			const state = songState({ stropheIndex: 2 });
			expect(getSetlistNavAction("next", state, "sl-1", "5", 5)).toBe("none");
		});

		it("navigates to next step on text slide", () => {
			const state: SlideState = {
				mode: "text",
				textTitle: "Lecture",
				setlistContext: setlistCtx,
			};
			expect(
				getSetlistNavAction(
					"next",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("next_step");
		});

		it("does nothing on text slide when not in setlist", () => {
			const state: SlideState = {
				mode: "text",
				textTitle: "Lecture",
				setlistContext: setlistCtx,
			};
			expect(getSetlistNavAction("next", state, undefined, undefined, 0)).toBe(
				"none",
			);
		});

		it("navigates to next step on idle (no song loaded) in setlist", () => {
			expect(
				getSetlistNavAction(
					"next",
					INITIAL_STATE,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("next_step");
		});

		it("does nothing on idle when not in setlist", () => {
			expect(
				getSetlistNavAction("next", INITIAL_STATE, undefined, undefined, 0),
			).toBe("none");
		});

		it("dispatches in logo mode with song (not at last strophe)", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 0,
				strophes: strophes3,
				setlistContext: setlistCtx,
			};
			expect(
				getSetlistNavAction(
					"next",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("dispatch");
		});

		it("dispatches in logo mode with song at last strophe (exits logo first)", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 2,
				strophes: strophes3,
				setlistContext: setlistCtx,
			};
			expect(
				getSetlistNavAction(
					"next",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("dispatch");
		});
	});

	describe("prev direction", () => {
		it("dispatches PREV_STROPHE when not at first strophe", () => {
			const state = songState({ stropheIndex: 2 });
			expect(
				getSetlistNavAction(
					"prev",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("dispatch");
		});

		it("navigates to prev step at first strophe in setlist", () => {
			const state = songState({ stropheIndex: 0 });
			expect(
				getSetlistNavAction(
					"prev",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("prev_step");
		});

		it("does nothing at first strophe when not in setlist", () => {
			const state = songState({ stropheIndex: 0 });
			expect(getSetlistNavAction("prev", state, undefined, undefined, 0)).toBe(
				"none",
			);
		});

		it("does nothing at first strophe of first setlist step", () => {
			const state = songState({ stropheIndex: 0 });
			expect(getSetlistNavAction("prev", state, "sl-1", "0", 5)).toBe("none");
		});

		it("navigates to prev step on text slide", () => {
			const state: SlideState = {
				mode: "text",
				textTitle: "Lecture",
				setlistContext: setlistCtx,
			};
			expect(
				getSetlistNavAction(
					"prev",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("prev_step");
		});

		it("dispatches in logo mode with song (exits logo first)", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 1,
				strophes: strophes3,
				setlistContext: setlistCtx,
			};
			expect(
				getSetlistNavAction(
					"prev",
					state,
					setlist.id,
					setlist.step,
					setlist.length,
				),
			).toBe("dispatch");
		});
	});
});

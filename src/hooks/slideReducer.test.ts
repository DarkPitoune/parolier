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
		it("fills in the strophes without moving the slide", () => {
			const synced = songState({ stropheIndex: 2, strophes: [] });
			const result = slideReducer(synced, {
				type: "HYDRATE_STROPHES",
				songId: 1,
				strophes: strophes3,
			});
			expect(result).toEqual(
				songState({ stropheIndex: 2, strophes: strophes3 }),
			);
		});

		it("keeps logo mode and its position", () => {
			const state: SlideState = {
				mode: "logo",
				songId: 1,
				stropheIndex: 1,
				strophes: [],
				setlistContext: setlistCtx,
			};
			const result = slideReducer(state, {
				type: "HYDRATE_STROPHES",
				songId: 1,
				strophes: strophes3,
			});
			expect(result).toEqual({ ...state, strophes: strophes3 });
		});

		it("keeps the setlist context", () => {
			const synced = songState({ strophes: [], setlistContext: setlistCtx });
			const result = slideReducer(synced, {
				type: "HYDRATE_STROPHES",
				songId: 1,
				strophes: strophes3,
			});
			expect(
				result.mode === "song" ? result.setlistContext : undefined,
			).toEqual(setlistCtx);
		});

		it("ignores a fetch that resolves for another song", () => {
			const state = songState({ songId: 1, stropheIndex: 1 });
			const result = slideReducer(state, {
				type: "HYDRATE_STROPHES",
				songId: 99,
				strophes: [makeVerse(["Other"])],
			});
			expect(result).toBe(state);
		});

		it("clamps a synced index past the end of the fetched strophes", () => {
			const synced = songState({ stropheIndex: 5, strophes: [] });
			const result = slideReducer(synced, {
				type: "HYDRATE_STROPHES",
				songId: 1,
				strophes: strophes3,
			});
			expect(result.mode === "song" && result.stropheIndex).toBe(2);
		});

		it("is a no-op in text and idle modes", () => {
			const text: SlideState = {
				mode: "text",
				textTitle: "Lecture",
				setlistContext: setlistCtx,
			};
			const event = {
				type: "HYDRATE_STROPHES" as const,
				songId: 1,
				strophes: strophes3,
			};
			expect(slideReducer(text, event)).toBe(text);
			expect(slideReducer(INITIAL_STATE, event)).toBe(INITIAL_STATE);
		});

		// The bug this event exists for: LOAD_SONG here would reset the slide and,
		// because every dispatch is broadcast, pull the other window back with it.
		it("survives the round trip that LOAD_SONG used to break", () => {
			const presenter = songState({ songId: 7, stropheIndex: 2 });
			const display = slideReducer(
				deserializeState(serializeState(presenter, "presenter")),
				{ type: "HYDRATE_STROPHES", songId: 7, strophes: strophes3 },
			);
			expect(display.mode === "song" && display.stropheIndex).toBe(2);

			const echoed = slideReducer(presenter, {
				type: "SYNC",
				payload: serializeState(display, "display"),
			});
			expect(echoed.mode === "song" && echoed.stropheIndex).toBe(2);
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

		it("preserves loaded strophes when syncing the same song (no re-fetch echo)", () => {
			// Same songId as current state, which already has strophes loaded.
			const payload: SyncPayload = {
				mode: "song",
				songId: 1,
				stropheIndex: 2,
				timestamp: Date.now(),
				source: "display",
			};
			const result = slideReducer(songState(), {
				type: "SYNC",
				payload,
			});
			expect(result).toMatchObject({
				mode: "song",
				songId: 1,
				stropheIndex: 2,
				strophes: strophes3, // kept, not cleared — breaks the echo loop
			});
		});

		it("keeps strophes across a logo toggle for the same song", () => {
			const payload: SyncPayload = {
				mode: "logo",
				songId: 1,
				stropheIndex: 0,
				timestamp: Date.now(),
				source: "display",
			};
			const result = slideReducer(songState(), {
				type: "SYNC",
				payload,
			});
			expect(result).toMatchObject({ mode: "logo", strophes: strophes3 });
		});

		it("clears strophes when syncing a different song (forces re-fetch)", () => {
			const payload: SyncPayload = {
				mode: "song",
				songId: 99,
				stropheIndex: 0,
				timestamp: Date.now(),
				source: "presenter",
			};
			const result = slideReducer(songState(), {
				type: "SYNC",
				payload,
			});
			expect(result).toMatchObject({
				mode: "song",
				songId: 99,
				strophes: [], // consumer must re-fetch the new song
			});
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
	// step is a 0-based index into the setlist's ordered items and totalSteps is
	// the item count, so a 5-step setlist runs 0..4 and "2" sits mid-list.
	const setlist = { id: "sl-1", step: "2", totalSteps: 5 };

	describe("next direction", () => {
		it("dispatches NEXT_STROPHE when not at last strophe", () => {
			const state = songState({ stropheIndex: 0 });
			expect(
				getSetlistNavAction(
					"next",
					state,
					setlist.id,
					setlist.step,
					setlist.totalSteps,
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
					setlist.totalSteps,
				),
			).toBe("next_step");
		});

		it("does nothing at last strophe when not in setlist", () => {
			const state = songState({ stropheIndex: 2 });
			expect(getSetlistNavAction("next", state, undefined, undefined, 0)).toBe(
				"none",
			);
		});

		it("navigates to next step at the second-to-last step", () => {
			const state = songState({ stropheIndex: 2 });
			expect(getSetlistNavAction("next", state, "sl-1", "3", 5)).toBe(
				"next_step",
			);
		});

		it("does nothing at last strophe of last setlist step", () => {
			const state = songState({ stropheIndex: 2 });
			// totalSteps is a count, so the last step of a 5-step setlist is 4
			expect(getSetlistNavAction("next", state, "sl-1", "4", 5)).toBe("none");
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
					setlist.totalSteps,
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
					setlist.totalSteps,
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
					setlist.totalSteps,
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
					setlist.totalSteps,
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
					setlist.totalSteps,
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
					setlist.totalSteps,
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
					setlist.totalSteps,
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
					setlist.totalSteps,
				),
			).toBe("dispatch");
		});
	});
});

describe("serializeState — performance notes", () => {
	it("never puts a strophe note on the wire", () => {
		// Notes are for the musicians. The projector shows the congregation
		// the lyrics, and nothing else, so the sync payload must stay clean.
		const noted: Strophe = {
			type: "chorus",
			repetition: false,
			content: [makeLine("Tu es là présent")],
			note: { who: ["🥁", "🎤"], how: ["🔥"], text: "on envoie" },
		};
		const state: SlideState = {
			mode: "song",
			songId: 104,
			strophes: [noted],
			stropheIndex: 0,
			setlistContext: null,
		};

		const payload = serializeState(state, "presenter");

		expect(payload.stropheContent).toEqual(noted.content);
		expect(JSON.stringify(payload)).not.toContain("note");
		expect(JSON.stringify(payload)).not.toContain("on envoie");
	});
});

describe("SYNC idempotence", () => {
	// The same state reaches a display window over localStorage and over the
	// network transport, so it legitimately arrives twice.
	const applyTwice = (state: SlideState, payload: SyncPayload) => {
		const once = slideReducer(state, { type: "SYNC", payload });
		const twice = slideReducer(once, { type: "SYNC", payload });
		return { once, twice };
	};

	it("is idempotent when the sync names the song already loaded", () => {
		// Dropping the preserved strophes on a second apply blanks the projector.
		const state = songState({ songId: 7, stropheIndex: 0 });
		const payload = serializeState(
			songState({ songId: 7, stropheIndex: 2 }),
			"presenter",
		);

		const { once, twice } = applyTwice(state, payload);

		expect(twice).toEqual(once);
		expect(once).toMatchObject({ mode: "song", songId: 7, stropheIndex: 2 });
		// and the strophes we already had are still there
		expect((once as Extract<SlideState, { mode: "song" }>).strophes).toEqual(
			strophes3,
		);
	});

	it("is idempotent when the sync names a different song", () => {
		const state = songState({ songId: 7 });
		const payload = serializeState(
			songState({ songId: 99, stropheIndex: 1 }),
			"presenter",
		);

		const { once, twice } = applyTwice(state, payload);

		expect(twice).toEqual(once);
		expect((once as Extract<SlideState, { mode: "song" }>).strophes).toEqual(
			[],
		);
	});

	it("is idempotent for logo and text payloads", () => {
		const logoPayload = serializeState(
			{
				mode: "logo",
				songId: 7,
				stropheIndex: 1,
				strophes: strophes3,
				setlistContext: null,
			},
			"presenter",
		);
		const logo = applyTwice(songState({ songId: 7 }), logoPayload);
		expect(logo.twice).toEqual(logo.once);

		const textPayload = serializeState(
			{ mode: "text", textTitle: "Prière", setlistContext: setlistCtx },
			"presenter",
		);
		const text = applyTwice(songState(), textPayload);
		expect(text.twice).toEqual(text.once);
		expect(text.once).toMatchObject({ mode: "text", textTitle: "Prière" });
	});

	it("is idempotent from idle", () => {
		const payload = serializeState(songState({ songId: 3 }), "presenter");
		const { once, twice } = applyTwice(INITIAL_STATE, payload);
		expect(twice).toEqual(once);
	});
});

describe("no musician-only note reaches the wire", () => {
	// Notes are for the band; the projector shows lyrics only. Inspects the whole
	// payload rather than a named field, so it survives payload changes.
	const noted: Strophe = {
		type: "chorus",
		repetition: false,
		content: [makeLine("Gloire à toi Seigneur")],
		note: { who: ["🥁", "🎤"], how: ["🔥"], text: "on envoie, batterie seule" },
	};

	const collectKeys = (value: unknown, found: string[] = []): string[] => {
		if (Array.isArray(value)) {
			for (const item of value) collectKeys(item, found);
		} else if (value && typeof value === "object") {
			for (const [key, child] of Object.entries(value)) {
				found.push(key);
				collectKeys(child, found);
			}
		}
		return found;
	};

	it("carries no `note` key anywhere in the payload", () => {
		const payload = serializeState(
			{
				mode: "song",
				songId: 104,
				strophes: [noted, noted],
				stropheIndex: 0,
				setlistContext: null,
			},
			"presenter",
		);

		expect(collectKeys(payload)).not.toContain("note");
	});

	it("carries none of the note's content, whatever shape the payload takes", () => {
		const payload = serializeState(
			{
				mode: "song",
				songId: 104,
				strophes: [noted],
				stropheIndex: 0,
				setlistContext: null,
			},
			"presenter",
		);
		const wire = JSON.stringify(payload);

		for (const secret of ["🥁", "🎤", "🔥", "on envoie", "batterie seule"]) {
			expect(wire).not.toContain(secret);
		}
		expect(wire).toContain("Gloire à toi Seigneur");
	});
});

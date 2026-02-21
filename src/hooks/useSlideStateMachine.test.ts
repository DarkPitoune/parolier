import { act, renderHook } from "@testing-library/react";
import type { SyncPayload } from "./slideReducer";
import { SLIDE_STATE_KEY, useSlideStateMachine } from "./useSlideStateMachine";

vi.mock("@/utils/mqtt", () => ({
	publishSlideState: vi.fn(),
	subscribeToSlideState: vi.fn(() => vi.fn()),
	// Keep legacy functions as mocks
	publishSongChange: vi.fn(),
	publishStropheChange: vi.fn(),
	publishLogoToggle: vi.fn(),
}));

import { publishSlideState, subscribeToSlideState } from "@/utils/mqtt";

const makeStrophes = () => [
	{
		type: "verse" as const,
		content: [{ text: "Line 1", chords: "" }],
		repetition: false,
	},
	{
		type: "verse" as const,
		content: [{ text: "Line 2", chords: "" }],
		repetition: false,
	},
];

beforeEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
	// Re-mock subscribeToSlideState since restoreAllMocks clears it
	vi.mocked(subscribeToSlideState).mockReturnValue(vi.fn());
});

describe("useSlideStateMachine", () => {
	describe("initialization", () => {
		it("initializes to idle when localStorage is empty", () => {
			const { result } = renderHook(() => useSlideStateMachine("presenter"));
			expect(result.current.state).toEqual({ mode: "idle" });
		});

		it("deserializes from localStorage on mount", () => {
			const payload: SyncPayload = {
				mode: "song",
				songId: 42,
				stropheIndex: 3,
				timestamp: Date.now(),
				source: "presenter",
			};
			localStorage.setItem(SLIDE_STATE_KEY, JSON.stringify(payload));

			const { result } = renderHook(() => useSlideStateMachine("display"));
			expect(result.current.state).toMatchObject({
				mode: "song",
				songId: 42,
				stropheIndex: 3,
				strophes: [], // Not serialized
			});
		});
	});

	describe("localStorage sync", () => {
		it("writes serialized payload to localStorage on dispatch", () => {
			const { result } = renderHook(() => useSlideStateMachine("presenter"));

			act(() => {
				result.current.dispatch({
					type: "LOAD_SONG",
					songId: 10,
					strophes: makeStrophes(),
				});
			});

			const stored = JSON.parse(
				localStorage.getItem(SLIDE_STATE_KEY) as string,
			);
			expect(stored.mode).toBe("song");
			expect(stored.songId).toBe(10);
			expect(stored.source).toBe("presenter");
		});

		it("writes on every dispatch (NEXT_STROPHE, TOGGLE_LOGO, etc.)", () => {
			const { result } = renderHook(() => useSlideStateMachine("presenter"));

			act(() => {
				result.current.dispatch({
					type: "LOAD_SONG",
					songId: 1,
					strophes: makeStrophes(),
				});
			});

			act(() => {
				result.current.dispatch({ type: "NEXT_STROPHE" });
			});

			const stored = JSON.parse(
				localStorage.getItem(SLIDE_STATE_KEY) as string,
			);
			expect(stored.stropheIndex).toBe(1);
		});

		it("updates state from StorageEvent from different source", () => {
			const { result } = renderHook(() => useSlideStateMachine("display"));

			const payload: SyncPayload = {
				mode: "song",
				songId: 99,
				stropheIndex: 2,
				timestamp: Date.now(),
				source: "presenter",
			};

			act(() => {
				window.dispatchEvent(
					new StorageEvent("storage", {
						key: SLIDE_STATE_KEY,
						newValue: JSON.stringify(payload),
					}),
				);
			});

			expect(result.current.state).toMatchObject({
				mode: "song",
				songId: 99,
				stropheIndex: 2,
			});
		});

		it("ignores StorageEvent from same source", () => {
			const { result } = renderHook(() => useSlideStateMachine("presenter"));

			act(() => {
				result.current.dispatch({
					type: "LOAD_SONG",
					songId: 1,
					strophes: makeStrophes(),
				});
			});

			const sameSourcePayload: SyncPayload = {
				mode: "song",
				songId: 999,
				stropheIndex: 0,
				timestamp: Date.now(),
				source: "presenter",
			};

			act(() => {
				window.dispatchEvent(
					new StorageEvent("storage", {
						key: SLIDE_STATE_KEY,
						newValue: JSON.stringify(sameSourcePayload),
					}),
				);
			});

			expect(result.current.state).toMatchObject({ songId: 1 });
		});
	});

	describe("MQTT broadcast (presenter role)", () => {
		it("publishes to MQTT on dispatch when role=presenter", () => {
			const { result } = renderHook(() => useSlideStateMachine("presenter"));

			act(() => {
				result.current.dispatch({
					type: "LOAD_SONG",
					songId: 42,
					strophes: makeStrophes(),
				});
			});

			expect(publishSlideState).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: "song",
					songId: 42,
					source: "presenter",
				}),
			);
		});

		it("publishes on NEXT_STROPHE", () => {
			const { result } = renderHook(() => useSlideStateMachine("presenter"));

			act(() => {
				result.current.dispatch({
					type: "LOAD_SONG",
					songId: 1,
					strophes: makeStrophes(),
				});
			});

			vi.mocked(publishSlideState).mockClear();

			act(() => {
				result.current.dispatch({ type: "NEXT_STROPHE" });
			});

			expect(publishSlideState).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: "song",
					stropheIndex: 1,
				}),
			);
		});

		it("publishes on TOGGLE_LOGO", () => {
			const { result } = renderHook(() => useSlideStateMachine("presenter"));

			act(() => {
				result.current.dispatch({
					type: "LOAD_SONG",
					songId: 1,
					strophes: makeStrophes(),
				});
			});

			vi.mocked(publishSlideState).mockClear();

			act(() => {
				result.current.dispatch({ type: "TOGGLE_LOGO" });
			});

			expect(publishSlideState).toHaveBeenCalledWith(
				expect.objectContaining({ mode: "logo" }),
			);
		});

		it("does not publish when role=display", () => {
			vi.mocked(publishSlideState).mockClear();

			const { result } = renderHook(() => useSlideStateMachine("display"));

			act(() => {
				result.current.dispatch({
					type: "LOAD_SONG",
					songId: 1,
					strophes: makeStrophes(),
				});
			});

			expect(publishSlideState).not.toHaveBeenCalled();
		});

		it("does not publish on SYNC events (prevents loops)", () => {
			vi.mocked(publishSlideState).mockClear();

			const { result } = renderHook(() => useSlideStateMachine("presenter"));

			const payload: SyncPayload = {
				mode: "song",
				songId: 5,
				stropheIndex: 0,
				timestamp: Date.now(),
				source: "display",
			};

			act(() => {
				result.current.dispatch({ type: "SYNC", payload });
			});

			expect(publishSlideState).not.toHaveBeenCalled();
		});
	});

	describe("MQTT subscription (display role)", () => {
		it("subscribes when role=display", () => {
			renderHook(() => useSlideStateMachine("display"));
			expect(subscribeToSlideState).toHaveBeenCalled();
		});

		it("does not subscribe when role=presenter", () => {
			vi.mocked(subscribeToSlideState).mockClear();
			renderHook(() => useSlideStateMachine("presenter"));
			expect(subscribeToSlideState).not.toHaveBeenCalled();
		});

		it("MQTT message updates state via SYNC", () => {
			let mqttCallback: ((payload: SyncPayload) => void) | null = null;
			vi.mocked(subscribeToSlideState).mockImplementation((cb) => {
				mqttCallback = cb;
				return vi.fn();
			});

			const { result } = renderHook(() => useSlideStateMachine("display"));

			const payload: SyncPayload = {
				mode: "song",
				songId: 77,
				stropheIndex: 1,
				timestamp: Date.now(),
				source: "presenter",
			};

			act(() => {
				mqttCallback?.(payload);
			});

			expect(result.current.state).toMatchObject({
				mode: "song",
				songId: 77,
				stropheIndex: 1,
			});
		});
	});
});

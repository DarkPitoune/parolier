import { act, renderHook } from "@testing-library/react";
import { useSlideController } from "./useSlideController";

const SLIDE_STATE_KEY = "parolier_slide_state";

vi.mock("@/utils/mqtt", () => ({
	publishSongChange: vi.fn(),
	publishStropheChange: vi.fn(),
	publishLogoToggle: vi.fn(),
}));

import {
	publishLogoToggle,
	publishSongChange,
	publishStropheChange,
} from "@/utils/mqtt";

beforeEach(() => {
	vi.restoreAllMocks();
});

describe("useSlideController", () => {
	describe("initial state", () => {
		it("returns default state when localStorage is empty", () => {
			const { result } = renderHook(() => useSlideController("test"));
			expect(result.current.slideState).toMatchObject({
				currentSongId: null,
				currentStropheIndex: 0,
				setlistId: null,
				stepNumber: null,
				isLogoSlide: false,
			});
		});

		it("restores state from localStorage on mount", () => {
			const stored = {
				currentSongId: 5,
				currentStropheIndex: 2,
				setlistId: "abc",
				stepNumber: 1,
				isLogoSlide: true,
				timestamp: 1000,
				source: "other",
			};
			localStorage.setItem(SLIDE_STATE_KEY, JSON.stringify(stored));

			const { result } = renderHook(() => useSlideController("test"));
			expect(result.current.slideState).toMatchObject({
				currentSongId: 5,
				currentStropheIndex: 2,
				setlistId: "abc",
				stepNumber: 1,
				isLogoSlide: true,
			});
		});
	});

	describe("navigateToSong", () => {
		it("sets songId, resets stropheIndex to 0, sets setlistId/stepNumber", () => {
			const { result } = renderHook(() => useSlideController("test"));

			act(() => {
				result.current.navigateToSong(42, "setlist-1", 3);
			});

			expect(result.current.slideState).toMatchObject({
				currentSongId: 42,
				currentStropheIndex: 0,
				setlistId: "setlist-1",
				stepNumber: 3,
				isLogoSlide: false,
			});
		});

		it("with preserveLogoSlide=true keeps logo state", () => {
			const { result } = renderHook(() => useSlideController("test"));

			// First enable logo
			act(() => {
				result.current.toggleLogoSlide();
			});
			expect(result.current.slideState.isLogoSlide).toBe(true);

			// Navigate with preserve
			act(() => {
				result.current.navigateToSong(10, "s1", 1, true);
			});
			expect(result.current.slideState.isLogoSlide).toBe(true);
			expect(result.current.slideState.currentSongId).toBe(10);
		});

		it("without preserveLogoSlide resets logo to false", () => {
			const { result } = renderHook(() => useSlideController("test"));

			act(() => {
				result.current.toggleLogoSlide();
			});
			expect(result.current.slideState.isLogoSlide).toBe(true);

			act(() => {
				result.current.navigateToSong(10, "s1", 1);
			});
			expect(result.current.slideState.isLogoSlide).toBe(false);
		});
	});

	describe("strophe navigation", () => {
		it("nextStrophe increments index", () => {
			const { result } = renderHook(() => useSlideController("test"));

			act(() => {
				result.current.nextStrophe();
			});
			expect(result.current.slideState.currentStropheIndex).toBe(1);

			act(() => {
				result.current.nextStrophe();
			});
			expect(result.current.slideState.currentStropheIndex).toBe(2);
		});

		it("prevStrophe decrements index", () => {
			const { result } = renderHook(() => useSlideController("test"));

			act(() => {
				result.current.nextStrophe();
				result.current.nextStrophe();
			});
			expect(result.current.slideState.currentStropheIndex).toBe(2);

			act(() => {
				result.current.prevStrophe();
			});
			expect(result.current.slideState.currentStropheIndex).toBe(1);
		});

		it("prevStrophe clamps at 0", () => {
			const { result } = renderHook(() => useSlideController("test"));

			act(() => {
				result.current.prevStrophe();
			});
			expect(result.current.slideState.currentStropheIndex).toBe(0);

			act(() => {
				result.current.prevStrophe();
			});
			expect(result.current.slideState.currentStropheIndex).toBe(0);
		});
	});

	describe("toggleLogoSlide", () => {
		it("flips isLogoSlide", () => {
			const { result } = renderHook(() => useSlideController("test"));
			expect(result.current.slideState.isLogoSlide).toBe(false);

			act(() => {
				result.current.toggleLogoSlide();
			});
			expect(result.current.slideState.isLogoSlide).toBe(true);

			act(() => {
				result.current.toggleLogoSlide();
			});
			expect(result.current.slideState.isLogoSlide).toBe(false);
		});
	});

	describe("localStorage persistence", () => {
		it("every update persists to localStorage", () => {
			const { result } = renderHook(() => useSlideController("test"));

			act(() => {
				result.current.navigateToSong(7);
			});

			const stored = JSON.parse(
				localStorage.getItem(SLIDE_STATE_KEY) as string,
			);
			expect(stored.currentSongId).toBe(7);
			expect(stored.source).toBe("test");
		});
	});

	describe("clearSlideState", () => {
		it("resets to initial state", () => {
			const { result } = renderHook(() => useSlideController("test"));

			act(() => {
				result.current.navigateToSong(42, "s1", 3);
				result.current.nextStrophe();
			});
			expect(result.current.slideState.currentSongId).toBe(42);

			act(() => {
				result.current.clearSlideState();
			});

			expect(result.current.slideState).toMatchObject({
				currentSongId: null,
				currentStropheIndex: 0,
				setlistId: null,
				stepNumber: null,
				isLogoSlide: false,
			});

			const stored = JSON.parse(
				localStorage.getItem(SLIDE_STATE_KEY) as string,
			);
			expect(stored.currentSongId).toBeNull();
		});
	});

	describe("cross-tab sync", () => {
		it("updates state when StorageEvent has different source", () => {
			const { result } = renderHook(() => useSlideController("tab-A"));

			const externalState = {
				currentSongId: 99,
				currentStropheIndex: 5,
				setlistId: "ext",
				stepNumber: 2,
				isLogoSlide: true,
				timestamp: Date.now(),
				source: "tab-B",
			};

			act(() => {
				window.dispatchEvent(
					new StorageEvent("storage", {
						key: SLIDE_STATE_KEY,
						newValue: JSON.stringify(externalState),
					}),
				);
			});

			expect(result.current.slideState).toMatchObject({
				currentSongId: 99,
				currentStropheIndex: 5,
				source: "tab-B",
			});
		});

		it("ignores StorageEvent with same source", () => {
			const { result } = renderHook(() => useSlideController("tab-A"));

			act(() => {
				result.current.navigateToSong(1);
			});

			const sameSourceState = {
				currentSongId: 999,
				currentStropheIndex: 0,
				setlistId: null,
				stepNumber: null,
				isLogoSlide: false,
				timestamp: Date.now(),
				source: "tab-A",
			};

			act(() => {
				window.dispatchEvent(
					new StorageEvent("storage", {
						key: SLIDE_STATE_KEY,
						newValue: JSON.stringify(sameSourceState),
					}),
				);
			});

			expect(result.current.slideState.currentSongId).toBe(1);
		});
	});

	describe("MQTT broadcast", () => {
		it("publishes song/strophe change when enableNetworkBroadcast=true", async () => {
			const { result } = renderHook(() =>
				useSlideController("presenter", true),
			);

			act(() => {
				result.current.navigateToSong(42);
			});

			// queueMicrotask is used internally, flush it
			await vi.waitFor(() => {
				expect(publishSongChange).toHaveBeenCalledWith(
					expect.objectContaining({ songId: 42, stropheIndex: 0 }),
				);
			});
		});

		it("publishes strophe change on nextStrophe", async () => {
			const { result } = renderHook(() =>
				useSlideController("presenter", true),
			);

			act(() => {
				result.current.navigateToSong(10);
			});

			vi.mocked(publishStropheChange).mockClear();

			act(() => {
				result.current.nextStrophe();
			});

			await vi.waitFor(() => {
				expect(publishStropheChange).toHaveBeenCalledWith(
					expect.objectContaining({ songId: 10, stropheIndex: 1 }),
				);
			});
		});

		it("publishes logo toggle", async () => {
			const { result } = renderHook(() =>
				useSlideController("presenter", true),
			);

			act(() => {
				result.current.toggleLogoSlide();
			});

			await vi.waitFor(() => {
				expect(publishLogoToggle).toHaveBeenCalledWith(
					expect.objectContaining({ isLogoSlide: true }),
				);
			});
		});

		it("does not publish when enableNetworkBroadcast=false", async () => {
			vi.mocked(publishSongChange).mockClear();
			vi.mocked(publishStropheChange).mockClear();
			vi.mocked(publishLogoToggle).mockClear();

			const { result } = renderHook(() => useSlideController("viewer", false));

			act(() => {
				result.current.navigateToSong(42);
			});

			// Give microtasks a chance to run
			await new Promise((r) => setTimeout(r, 10));

			expect(publishSongChange).not.toHaveBeenCalled();
			expect(publishStropheChange).not.toHaveBeenCalled();
		});
	});
});

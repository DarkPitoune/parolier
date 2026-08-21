import type { Line, Strophe } from "@/assets/types";

// --- Types ---

export type SlideMode = "idle" | "song" | "logo" | "text";

export type SetlistContext = {
	setlistId: string;
	stepNumber: number;
	totalSteps: number;
};

export type SlideState =
	| { mode: "idle" }
	| {
			mode: "song";
			songId: number;
			stropheIndex: number;
			strophes: Strophe[];
			setlistContext: SetlistContext | null;
	  }
	| {
			mode: "logo";
			songId: number | null;
			stropheIndex: number;
			strophes: Strophe[];
			setlistContext: SetlistContext | null;
	  }
	| {
			mode: "text";
			textTitle: string;
			setlistContext: SetlistContext;
	  };

export type SlideEvent =
	| {
			type: "LOAD_SONG";
			songId: number;
			strophes: Strophe[];
			setlistContext?: SetlistContext;
	  }
	| { type: "LOAD_TEXT"; textTitle: string; setlistContext: SetlistContext }
	| { type: "HYDRATE_STROPHES"; songId: number; strophes: Strophe[] }
	| { type: "NEXT_STROPHE" }
	| { type: "PREV_STROPHE" }
	| { type: "GOTO_STROPHE"; stropheIndex: number }
	| { type: "TOGGLE_LOGO" }
	| { type: "GO_IDLE" }
	| { type: "SYNC"; payload: SyncPayload };

export type SyncPayload = {
	mode: SlideMode;
	songId?: number;
	stropheIndex?: number;
	textTitle?: string;
	setlistContext?: SetlistContext;
	stropheContent?: Line[];
	timestamp: number;
	source: "presenter" | "display";
};

// --- Initial state ---

export const INITIAL_STATE: SlideState = { mode: "idle" };

// --- Reducer ---

export function slideReducer(state: SlideState, event: SlideEvent): SlideState {
	switch (event.type) {
		case "LOAD_SONG":
			return {
				mode: "song",
				songId: event.songId,
				stropheIndex: 0,
				strophes: event.strophes,
				setlistContext: event.setlistContext ?? null,
			};

		case "LOAD_TEXT":
			return {
				mode: "text",
				textTitle: event.textTitle,
				setlistContext: event.setlistContext,
			};

		case "HYDRATE_STROPHES": {
			// Sync payloads leave the strophe array out, so a window that receives
			// one has to fetch the words itself. That fetch must NOT be a LOAD_SONG:
			// LOAD_SONG means "start this song from the top", so it would move the
			// slide the window just synced to — and, because every dispatch is
			// broadcast, drag every other window along with it.
			if (state.mode !== "song" && state.mode !== "logo") return state;
			// A fetch that resolves after we've moved on belongs to another song.
			if (state.songId !== event.songId) return state;
			return {
				...state,
				strophes: event.strophes,
				stropheIndex: Math.min(
					state.stropheIndex,
					Math.max(0, event.strophes.length - 1),
				),
			};
		}

		case "NEXT_STROPHE": {
			if (state.mode === "logo" && state.songId !== null) {
				const maxIndex = Math.max(0, state.strophes.length - 1);
				return {
					mode: "song",
					songId: state.songId,
					strophes: state.strophes,
					setlistContext: state.setlistContext,
					stropheIndex: Math.min(state.stropheIndex + 1, maxIndex),
				};
			}
			if (state.mode !== "song") return state;
			const maxIndex = Math.max(0, state.strophes.length - 1);
			return {
				...state,
				stropheIndex: Math.min(state.stropheIndex + 1, maxIndex),
			};
		}

		case "PREV_STROPHE": {
			if (state.mode === "logo" && state.songId !== null) {
				return {
					mode: "song",
					songId: state.songId,
					strophes: state.strophes,
					setlistContext: state.setlistContext,
					stropheIndex: Math.max(0, state.stropheIndex - 1),
				};
			}
			if (state.mode !== "song") return state;
			return {
				...state,
				stropheIndex: Math.max(0, state.stropheIndex - 1),
			};
		}

		case "GOTO_STROPHE": {
			if (state.mode !== "song") return state;
			const maxIdx = Math.max(0, state.strophes.length - 1);
			return {
				...state,
				stropheIndex: Math.max(0, Math.min(event.stropheIndex, maxIdx)),
			};
		}

		case "TOGGLE_LOGO": {
			if (state.mode === "song") {
				return {
					mode: "logo",
					songId: state.songId,
					stropheIndex: state.stropheIndex,
					strophes: state.strophes,
					setlistContext: state.setlistContext,
				};
			}
			if (state.mode === "logo") {
				if (state.songId !== null) {
					return {
						mode: "song",
						songId: state.songId,
						stropheIndex: state.stropheIndex,
						strophes: state.strophes,
						setlistContext: state.setlistContext,
					};
				}
				return INITIAL_STATE;
			}
			if (state.mode === "text") {
				return {
					mode: "logo",
					songId: null,
					stropheIndex: 0,
					strophes: [],
					setlistContext: state.setlistContext,
				};
			}
			// idle
			return {
				mode: "logo",
				songId: null,
				stropheIndex: 0,
				strophes: [],
				setlistContext: null,
			};
		}

		case "GO_IDLE":
			return INITIAL_STATE;

		case "SYNC": {
			const next = deserializeState(event.payload);
			// Synced payloads deliberately omit the strophe array, so
			// deserializeState returns `strophes: []` and expects the consumer
			// to re-fetch. When the sync refers to the SAME song we already have
			// loaded, preserve those strophes and only apply the new position/mode.
			// This avoids the re-fetch → LOAD_SONG → re-broadcast echo loop that
			// otherwise bounces state between the presenter and display windows
			// (and let strophe navigation sync without resetting to strophe 0).
			if (
				(next.mode === "song" || next.mode === "logo") &&
				(state.mode === "song" || state.mode === "logo") &&
				next.songId !== null &&
				next.songId === state.songId &&
				state.strophes.length > 0
			) {
				return { ...next, strophes: state.strophes };
			}
			return next;
		}
	}
}

// --- Setlist navigation helpers ---

export type SetlistNavAction = "next_step" | "prev_step" | "dispatch" | "none";

/**
 * `stepNumber` is a 0-based index into the setlist's ordered items (see
 * sortSetlistItems) and `totalSteps` is the item count — so the last step is
 * `totalSteps - 1`.
 */
export function getSetlistNavAction(
	direction: "next" | "prev",
	state: SlideState,
	setlistId: string | undefined,
	stepNumber: string | undefined,
	totalSteps: number,
): SetlistNavAction {
	const isText = state.mode === "text";
	const isLogoWithSong = state.mode === "logo" && state.songId !== null;
	const strophes =
		state.mode === "song" || state.mode === "logo" ? state.strophes : [];
	const stropheIndex =
		state.mode === "song" || state.mode === "logo" ? state.stropheIndex : 0;

	// In logo mode with a song, always dispatch so the reducer exits logo first
	if (isLogoWithSong) return "dispatch";

	const inSetlist = !!(setlistId && stepNumber);
	const step = Number(stepNumber);

	if (direction === "next") {
		if (isText || strophes.length === 0) {
			return inSetlist && step < totalSteps - 1 ? "next_step" : "none";
		}
		if (stropheIndex < strophes.length - 1) {
			return "dispatch";
		}
		return inSetlist && step < totalSteps - 1 ? "next_step" : "none";
	}

	// prev
	if (isText || strophes.length === 0) {
		return inSetlist && step > 0 ? "prev_step" : "none";
	}
	if (stropheIndex > 0) {
		return "dispatch";
	}
	return inSetlist && step > 0 ? "prev_step" : "none";
}

// --- Serialization ---

export function serializeState(
	state: SlideState,
	source: "presenter" | "display",
): SyncPayload {
	const base = {
		mode: state.mode,
		timestamp: Date.now(),
		source,
	};

	switch (state.mode) {
		case "song": {
			const currentStrophe = state.strophes[state.stropheIndex];
			return {
				...base,
				songId: state.songId,
				stropheIndex: state.stropheIndex,
				setlistContext: state.setlistContext ?? undefined,
				stropheContent:
					currentStrophe && currentStrophe.type !== "section"
						? currentStrophe.content
						: undefined,
			};
		}
		case "logo":
			return {
				...base,
				songId: state.songId ?? undefined,
				stropheIndex: state.stropheIndex,
				setlistContext: state.setlistContext ?? undefined,
			};
		case "text":
			return {
				...base,
				textTitle: state.textTitle,
				setlistContext: state.setlistContext,
			};
		case "idle":
			return base;
	}
}

export function deserializeState(payload: SyncPayload): SlideState {
	switch (payload.mode) {
		case "song":
			if (payload.songId === undefined) return INITIAL_STATE;
			return {
				mode: "song",
				songId: payload.songId,
				stropheIndex: payload.stropheIndex ?? 0,
				strophes: [], // Consumer must re-fetch
				setlistContext: payload.setlistContext ?? null,
			};
		case "logo":
			return {
				mode: "logo",
				songId: payload.songId ?? null,
				stropheIndex: payload.stropheIndex ?? 0,
				strophes: [], // Consumer must re-fetch
				setlistContext: payload.setlistContext ?? null,
			};
		case "text":
			if (!payload.textTitle || !payload.setlistContext) return INITIAL_STATE;
			return {
				mode: "text",
				textTitle: payload.textTitle,
				setlistContext: payload.setlistContext,
			};
		default:
			return INITIAL_STATE;
	}
}

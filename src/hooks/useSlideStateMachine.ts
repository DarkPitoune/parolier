import { publishSlideState, subscribeToSlideState } from "@/utils/mqtt";
import { useCallback, useEffect, useReducer, useRef } from "react";
import {
	INITIAL_STATE,
	type SlideEvent,
	type SlideState,
	type SyncPayload,
	deserializeState,
	serializeState,
	slideReducer,
} from "./slideReducer";

export type SlideRole = "presenter" | "display";

const SLIDE_STATE_KEY = "parolier_slide_state";

function readStoredState(): SlideState {
	try {
		const raw = localStorage.getItem(SLIDE_STATE_KEY);
		if (raw) {
			const payload = JSON.parse(raw) as SyncPayload;
			return deserializeState(payload);
		}
	} catch {
		// Corrupt data — start fresh
	}
	return INITIAL_STATE;
}

export function useSlideStateMachine(role: SlideRole) {
	const [state, rawDispatch] = useReducer(
		slideReducer,
		undefined,
		readStoredState,
	);
	const stateRef = useRef(state);
	stateRef.current = state;

	const roleRef = useRef(role);
	roleRef.current = role;

	const dispatch = useCallback((event: SlideEvent) => {
		rawDispatch(event);

		// We need the new state after dispatch for serialization.
		// useReducer is synchronous, so we compute it ourselves.
		const newState = slideReducer(stateRef.current, event);
		stateRef.current = newState;

		// Write to localStorage for cross-window sync
		const payload = serializeState(newState, roleRef.current);
		localStorage.setItem(SLIDE_STATE_KEY, JSON.stringify(payload));

		// Publish to MQTT (presenter only, skip SYNC events to prevent loops)
		if (roleRef.current === "presenter" && event.type !== "SYNC") {
			try {
				publishSlideState(payload);
			} catch {
				// MQTT might not be connected — that's fine
			}
		}
	}, []);

	// Cross-window sync via StorageEvent
	useEffect(() => {
		const handleStorage = (e: StorageEvent) => {
			if (e.key !== SLIDE_STATE_KEY || !e.newValue) return;
			try {
				const payload = JSON.parse(e.newValue) as SyncPayload;
				// Ignore events from the same role (self-echo)
				if (payload.source === roleRef.current) return;
				rawDispatch({ type: "SYNC", payload });
				stateRef.current = slideReducer(stateRef.current, {
					type: "SYNC",
					payload,
				});
			} catch {
				// Ignore corrupt data
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	// MQTT subscription (display role only)
	useEffect(() => {
		if (roleRef.current !== "display") return;

		const unsubscribe = subscribeToSlideState((payload: SyncPayload) => {
			// Ignore messages from our own role
			if (payload.source === roleRef.current) return;
			rawDispatch({ type: "SYNC", payload });
			stateRef.current = slideReducer(stateRef.current, {
				type: "SYNC",
				payload,
			});
		});

		return unsubscribe;
	}, []);

	// Local-only dispatch: updates state without writing to localStorage or MQTT.
	// Use this when the display hydrates strophes from network after a sync —
	// those are local rendering concerns, not state changes to broadcast.
	const localDispatch = useCallback((event: SlideEvent) => {
		rawDispatch(event);
		stateRef.current = slideReducer(stateRef.current, event);
	}, []);

	return { state, dispatch, localDispatch } as const;
}

export { SLIDE_STATE_KEY };

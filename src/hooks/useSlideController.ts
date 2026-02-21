import {
	publishLogoToggle,
	publishSongChange,
	publishStropheChange,
} from "@/utils/mqtt";
import { useCallback, useEffect, useState } from "react";

export type SlideState = {
	currentSongId: number | null;
	currentStropheIndex: number;
	setlistId: string | null;
	stepNumber: number | null;
	isLogoSlide: boolean;
	timestamp: number;
	source: string;
};

const SLIDE_STATE_KEY = "parolier_slide_state";

const getInitialState = (): SlideState => ({
	currentSongId: null,
	currentStropheIndex: 0,
	setlistId: null,
	stepNumber: null,
	isLogoSlide: false,
	timestamp: Date.now(),
	source: "initial",
});

type StropheContent = Array<{ text: string; chords?: string }>;

export const useSlideController = (
	source = "unknown",
	enableNetworkBroadcast = false,
) => {
	const [slideState, setSlideState] = useState<SlideState>(() => {
		const stored = localStorage.getItem(SLIDE_STATE_KEY);
		return stored ? JSON.parse(stored) : getInitialState();
	});

	const updateSlideState = useCallback(
		(
			updatesOrFn:
				| Partial<SlideState>
				| ((prev: SlideState) => Partial<SlideState>),
			broadcastToNetwork = false,
			stropheContent?: StropheContent,
		) => {
			setSlideState((prev) => {
				const updates =
					typeof updatesOrFn === "function"
						? updatesOrFn(prev)
						: updatesOrFn;

				const newState = {
					...prev,
					...updates,
					timestamp: Date.now(),
					source,
				};
				localStorage.setItem(SLIDE_STATE_KEY, JSON.stringify(newState));

				if (enableNetworkBroadcast && broadcastToNetwork) {
					queueMicrotask(() => {
						try {
							if (updates.currentStropheIndex !== undefined) {
								publishStropheChange({
									songId:
										updates.currentSongId ??
										newState.currentSongId ??
										0,
									stropheIndex: updates.currentStropheIndex,
									content: stropheContent,
								});
							}
							if (updates.isLogoSlide !== undefined) {
								publishLogoToggle({
									isLogoSlide: updates.isLogoSlide,
								});
							}
							if (
								updates.currentSongId !== undefined &&
								updates.currentSongId !== null
							) {
								publishSongChange({
									songId: updates.currentSongId,
									stropheIndex:
										updates.currentStropheIndex || 0,
									content: stropheContent,
								});
							}
						} catch (error) {
							console.error(
								"[SlideController] Failed to broadcast to network:",
								error,
							);
						}
					});
				}

				return newState;
			});
		},
		[source, enableNetworkBroadcast],
	);

	const clearSlideState = useCallback(() => {
		const clearedState = getInitialState();
		setSlideState(clearedState);
		localStorage.setItem(SLIDE_STATE_KEY, JSON.stringify(clearedState));
	}, []);

	// Listen for storage changes from other windows
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === SLIDE_STATE_KEY && e.newValue) {
				const newState = JSON.parse(e.newValue);
				if (newState.source !== source) {
					setSlideState(newState);
				}
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [source]);

	const navigateToSong = useCallback(
		(
			songId: number,
			setlistId?: string,
			stepNumber?: number,
			preserveLogoSlide = false,
			stropheContent?: StropheContent,
		) => {
			const updates: Partial<SlideState> = {
				currentSongId: songId,
				currentStropheIndex: 0,
				setlistId: setlistId || null,
				stepNumber: stepNumber || null,
			};

			if (!preserveLogoSlide) {
				updates.isLogoSlide = false;
			}

			updateSlideState(updates, true, stropheContent);
		},
		[updateSlideState],
	);

	const navigateToStrophe = useCallback(
		(stropheIndex: number) => {
			updateSlideState({
				currentStropheIndex: stropheIndex,
				isLogoSlide: false,
			});
		},
		[updateSlideState],
	);

	const nextStrophe = useCallback(
		(stropheContent?: StropheContent) => {
			updateSlideState(
				(prev) => ({
					currentStropheIndex: prev.currentStropheIndex + 1,
				}),
				true,
				stropheContent,
			);
		},
		[updateSlideState],
	);

	const prevStrophe = useCallback(
		(stropheContent?: StropheContent) => {
			updateSlideState(
				(prev) => ({
					currentStropheIndex: Math.max(
						0,
						prev.currentStropheIndex - 1,
					),
				}),
				true,
				stropheContent,
			);
		},
		[updateSlideState],
	);

	const toggleLogoSlide = useCallback(() => {
		updateSlideState(
			(prev) => ({ isLogoSlide: !prev.isLogoSlide }),
			true,
		);
	}, [updateSlideState]);

	return {
		slideState,
		updateSlideState,
		clearSlideState,
		navigateToSong,
		navigateToStrophe,
		nextStrophe,
		prevStrophe,
		toggleLogoSlide,
	};
};

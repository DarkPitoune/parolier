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
			updates: Partial<SlideState>,
			broadcastToNetwork = false,
			stropheContent?: Array<{ text: string; chords?: string }>,
		) => {
			console.log("[SlideController] 📝 updateSlideState called:", {
				source,
				updates,
				broadcastToNetwork,
				enableNetworkBroadcast,
				willBroadcast: enableNetworkBroadcast && broadcastToNetwork,
			});

			const newState = {
				...slideState,
				...updates,
				timestamp: Date.now(),
				source,
			};
			setSlideState(newState);
			localStorage.setItem(SLIDE_STATE_KEY, JSON.stringify(newState));

			// Broadcast to network if enabled and requested
			if (enableNetworkBroadcast && broadcastToNetwork) {
				console.log("[SlideController] 📡 Broadcasting to MQTT network");
				try {
					// Send absolute strophe position for network sync
					if (updates.currentStropheIndex !== undefined) {
						console.log("[SlideController] 📡 Publishing strophe change");
						publishStropheChange({
							songId: updates.currentSongId ?? slideState.currentSongId ?? 0,
							stropheIndex: updates.currentStropheIndex,
							content: stropheContent,
						});
					}

					// Send logo toggle events
					if (updates.isLogoSlide !== undefined) {
						console.log("[SlideController] 📡 Publishing logo toggle");
						publishLogoToggle({ isLogoSlide: updates.isLogoSlide });
					}

					// Send song change events
					if (
						updates.currentSongId !== undefined &&
						updates.currentSongId !== null
					) {
						console.log("[SlideController] 📡 Publishing song change");
						publishSongChange({
							songId: updates.currentSongId,
							stropheIndex: updates.currentStropheIndex || 0,
							content: stropheContent,
						});
					}
				} catch (error) {
					console.error("[SlideController] Failed to broadcast to network:", error);
				}
			}
		},
		[slideState, source, enableNetworkBroadcast],
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
				console.log("[SlideController] 💾 localStorage changed:", {
					currentSource: source,
					newStateSource: newState.source,
					willUpdate: newState.source !== source,
					newState,
				});
				// Only update if the change came from another source
				if (newState.source !== source) {
					console.log("[SlideController] ⚡ Updating state from localStorage");
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
			stropheContent?: Array<{ text: string; chords?: string }>,
		) => {
			console.log("[SlideController] 🎵 navigateToSong called:", {
				songId,
				setlistId,
				stepNumber,
				preserveLogoSlide,
				currentSongId: slideState.currentSongId,
			});

			const updates: Partial<SlideState> = {
				currentSongId: songId,
				currentStropheIndex: 0,
				setlistId: setlistId || null,
				stepNumber: stepNumber || null,
			};

			// Only reset logo slide if not preserving it
			if (!preserveLogoSlide) {
				updates.isLogoSlide = false;
			}

			updateSlideState(updates, true, stropheContent); // Broadcast to network
		},
		[updateSlideState, slideState.currentSongId],
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
		(stropheContent?: Array<{ text: string; chords?: string }>) => {
			updateSlideState(
				{
					currentStropheIndex: slideState.currentStropheIndex + 1,
				},
				true,
				stropheContent,
			); // Broadcast to network
		},
		[updateSlideState, slideState.currentStropheIndex],
	);

	const prevStrophe = useCallback(
		(stropheContent?: Array<{ text: string; chords?: string }>) => {
			updateSlideState(
				{
					currentStropheIndex: Math.max(0, slideState.currentStropheIndex - 1),
				},
				true,
				stropheContent,
			); // Broadcast to network
		},
		[updateSlideState, slideState.currentStropheIndex],
	);

	const toggleLogoSlide = useCallback(() => {
		updateSlideState(
			{
				isLogoSlide: !slideState.isLogoSlide,
			},
			true,
		); // Broadcast to network
	}, [updateSlideState, slideState.isLogoSlide]);

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

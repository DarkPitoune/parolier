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

export const useSlideController = (source = "unknown") => {
	const [slideState, setSlideState] = useState<SlideState>(() => {
		const stored = localStorage.getItem(SLIDE_STATE_KEY);
		return stored ? JSON.parse(stored) : getInitialState();
	});

	const updateSlideState = useCallback(
		(updates: Partial<SlideState>) => {
			const newState = {
				...slideState,
				...updates,
				timestamp: Date.now(),
				source,
			};
			setSlideState(newState);
			localStorage.setItem(SLIDE_STATE_KEY, JSON.stringify(newState));
		},
		[slideState, source],
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
				// Only update if the change came from another source
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
		) => {
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

			updateSlideState(updates);
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

	const nextStrophe = useCallback(() => {
		updateSlideState({
			currentStropheIndex: slideState.currentStropheIndex + 1,
		});
	}, [updateSlideState, slideState.currentStropheIndex]);

	const prevStrophe = useCallback(() => {
		updateSlideState({
			currentStropheIndex: Math.max(0, slideState.currentStropheIndex - 1),
		});
	}, [updateSlideState, slideState.currentStropheIndex]);

	const toggleLogoSlide = useCallback(() => {
		updateSlideState({
			isLogoSlide: !slideState.isLogoSlide,
		});
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

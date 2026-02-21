import type { Strophe } from "@/assets/types";
import {
	SlideFinder,
	SlideHelp,
	SlideViewer,
	TouchScreenListener,
	slideHelpAtom,
} from "@/components";
import {
	useSetlistLength,
	useSetlistStep,
} from "@/hooks/queries/useSetlistQueries";
import { useTaggedSong } from "@/hooks/queries/useSongQueries";
import { useMqttConnectionStatus } from "@/hooks/useMqttConnectionStatus";
import { useSlideController } from "@/hooks/useSlideController";
import { useWakeLock } from "@/hooks/useWakeLock";
import { subscribeToEvents } from "@/utils/mqtt";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const SlidePage = () => {
	const { songId, stepNumber, setlistId } = useParams();
	const [strophes, setStrophes] = useState<Strophe[]>([]);
	const [isTextSlide, setIsTextSlide] = useState(false);
	const navigate = useNavigate();
	const [slideHelp, setSlideHelp] = useAtom(slideHelpAtom);

	const {
		slideState,
		nextStrophe,
		prevStrophe,
		toggleLogoSlide,
		navigateToSong,
		navigateToStrophe,
	} = useSlideController("slideshow");
	const { currentStropheIndex, isLogoSlide } = slideState;

	// Monitor MQTT connection status
	useMqttConnectionStatus({ position: "top-center" });

	// Keep screen awake during slideshow
	useWakeLock();

	// Setlist length query
	const { data: setlistLength = 0 } = useSetlistLength(setlistId);

	// Determine which song ID to load: URL songId > slideState > setlist step
	const songIdFromUrl = songId ? Number(songId) : undefined;
	const effectiveSongId =
		songIdFromUrl ?? slideState.currentSongId ?? undefined;

	// Load song data via query (covers URL songId and slideState songId)
	const { data: songData, error: songError } = useTaggedSong(effectiveSongId);

	// Load setlist step data (only when no direct songId)
	const { data: stepData } = useSetlistStep(
		!songId && !slideState.currentSongId ? setlistId : undefined,
		!songId && !slideState.currentSongId && stepNumber
			? Number(stepNumber)
			: undefined,
	);

	// Sync strophes from song query
	useEffect(() => {
		if (songData?.strophes) {
			setStrophes(songData.strophes);
			// Sync slide state with URL if needed
			if (songIdFromUrl && slideState.currentSongId !== songIdFromUrl) {
				navigateToSong(songIdFromUrl);
			}
		} else if (effectiveSongId && songError) {
			setStrophes([]);
			toast.error("Connexion à internet requise", {
				style: { backgroundColor: "black", color: "white" },
			});
		}
	}, [
		songData,
		songError,
		songIdFromUrl,
		effectiveSongId,
		slideState.currentSongId,
		navigateToSong,
	]);

	// Sync strophes from setlist step query
	useEffect(() => {
		if (!stepData) return;
		if (stepData.songs) {
			setStrophes(stepData.songs.strophes);
			setIsTextSlide(false);
			toast(stepData.songs.title, {
				position: "top-center",
				style: { backgroundColor: "black", color: "white" },
			});
		} else {
			setStrophes([]);
			setIsTextSlide(true);
			const label =
				stepData.texts?.title ?? (stepData.text ? "Texte libre" : "Texte");
			toast(label, {
				position: "top-center",
				style: { backgroundColor: "black", color: "white" },
			});
		}
	}, [stepData]);

	const handleNextStrophe = useCallback(() => {
		if (isTextSlide || strophes.length === 0) {
			// If this is a text slide, go to next setlist item
			if (setlistId && stepNumber && Number(stepNumber) < setlistLength) {
				navigate(
					`/setlists/${setlistId}/steps/${Number(stepNumber) + 1}/slide`,
				);
			}
			return;
		}

		if (currentStropheIndex < strophes.length - 1) {
			nextStrophe();
		} else if (setlistId && stepNumber && Number(stepNumber) < setlistLength) {
			navigate(`/setlists/${setlistId}/steps/${Number(stepNumber) + 1}/slide`);
		}
	}, [
		currentStropheIndex,
		navigate,
		setlistId,
		stepNumber,
		strophes.length,
		setlistLength,
		nextStrophe,
		isTextSlide,
	]);

	const handlePrevStrophe = useCallback(() => {
		if (isTextSlide || strophes.length === 0) {
			// If this is a text slide, go to previous setlist item
			if (setlistId && stepNumber && Number(stepNumber) > 0) {
				navigate(
					`/setlists/${setlistId}/steps/${Number(stepNumber) - 1}/slide`,
				);
			}
			return;
		}

		if (currentStropheIndex > 0) {
			prevStrophe();
		} else if (setlistId && stepNumber && Number(stepNumber) > 0) {
			navigate(`/setlists/${setlistId}/steps/${Number(stepNumber) - 1}/slide`);
		}
	}, [
		currentStropheIndex,
		navigate,
		setlistId,
		stepNumber,
		strophes.length,
		prevStrophe,
		isTextSlide,
	]);

	useEffect(() => {
		console.log("[SlidePage] 🔌 Setting up MQTT subscriptions");
		// Subscribe to MQTT events
		const unsubscribe = subscribeToEvents({
			onStropheChange: (payload) => {
				console.log("[SlidePage] 🔄 MQTT onStropheChange handler:", {
					payload,
					currentSongId: slideState.currentSongId,
					currentStropheIndex,
				});
				// Navigate to absolute strophe position
				if (
					payload.songId === slideState.currentSongId &&
					payload.stropheIndex !== currentStropheIndex
				) {
					console.log(
						"[SlidePage] ✅ Navigating to strophe:",
						payload.stropheIndex,
					);
					navigateToStrophe(payload.stropheIndex);
				} else {
					console.log(
						"[SlidePage] ⏭️ Ignoring strophe change (already at position or different song)",
					);
				}
			},
			onLogoToggle: (payload) => {
				console.log("[SlidePage] 🎨 MQTT onLogoToggle handler:", {
					payload,
					currentLogoState: isLogoSlide,
				});
				// Update slide controller to match remote logo state
				if (payload.isLogoSlide !== isLogoSlide) {
					console.log("[SlidePage] ✅ Toggling logo slide");
					toggleLogoSlide();
				} else {
					console.log(
						"[SlidePage] ⏭️ Ignoring logo toggle (already in desired state)",
					);
				}
			},
			onSongChange: (payload) => {
				console.log("[SlidePage] 🎵 MQTT onSongChange handler:", {
					payload,
					currentSongId: slideState.currentSongId,
				});
				// Navigate to the song sent from remote
				console.log("[SlidePage] ➡️ Calling navigateToSong from MQTT");
				navigateToSong(payload.songId);
			},
		});

		return () => {
			console.log("[SlidePage] 🔌 Unsubscribing from MQTT");
			unsubscribe();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (isTextSlide || strophes.length === 0) {
				// If text slide or no song is open, handle setlist navigation
				if (e.key === "ArrowLeft") handlePrevStrophe();
				if (e.key === "ArrowRight") handleNextStrophe();
				if (e.key === "f" || e.key === "F") document.body.requestFullscreen();
				return;
			}

			// If a song is open, handle strophe navigation
			if (e.key === "ArrowRight") handleNextStrophe();
			if (e.key === "ArrowLeft") handlePrevStrophe();
			if (e.key === "f" || e.key === "F") document.body.requestFullscreen();
		};
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("keydown", handleKey);
		};
	}, [handleNextStrophe, handlePrevStrophe, isTextSlide, strophes.length]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") setSlideHelp((v) => !v);
			if (e.key === "t" || e.key === "T") toggleLogoSlide();
			if (e.key === "Escape" && !document.fullscreenElement) navigate("/");
			if (e.key === "q" || e.key === "Q") document.exitFullscreen();
		};
		document.addEventListener("keydown", handleKey);

		const handleQuit = () => {
			if (!document.fullscreenElement) navigate("/");
		};
		document.addEventListener("fullscreenchange", handleQuit);
		return () => {
			document.removeEventListener("keydown", handleKey);
			document.removeEventListener("fullscreenchange", handleQuit);
		};
	}, [navigate, setSlideHelp, toggleLogoSlide]);

	return (
		<div className="absolute z-20 inset-0 flex flex-col justify-center items-center text-white bg-black overflow-clip">
			<SlideFinder />
			{isLogoSlide ||
			isTextSlide ||
			strophes[currentStropheIndex] === undefined ? (
				<img src="/svg/Jubilate_Croix.svg" alt="logo" className="size-36" />
			) : (
				<>
					<SlideViewer
						key={`${songId || stepNumber}-${currentStropheIndex}`}
						strophe={strophes[currentStropheIndex]}
					/>
					{currentStropheIndex === strophes.length - 1 && (
						<div className="absolute bottom-4 right-4 size-3 rounded-full bg-white opacity-60" />
					)}
					<div className="absolute inset-0 flex items-stretch justify-stretch">
						<div className="grow" onTouchStart={handlePrevStrophe} />
						<div className="grow" onTouchStart={handleNextStrophe} />
					</div>
				</>
			)}
			{slideHelp && <SlideHelp />}
			<TouchScreenListener />
		</div>
	);
};

export { SlidePage };

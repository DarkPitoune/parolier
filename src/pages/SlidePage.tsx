import type { Strophe } from "@/assets/types";
import {
	SlideFinder,
	SlideHelp,
	SlideViewer,
	TouchScreenListener,
	slideHelpAtom,
} from "@/components";
import { useMqttConnectionStatus } from "@/hooks/useMqttConnectionStatus";
import { useSlideController } from "@/hooks/useSlideController";
import { useWakeLock } from "@/hooks/useWakeLock";
import { subscribeToEvents } from "@/utils/mqtt";
import {
	setlistLengthQuery,
	taggedSongFromSetlistStepQuery,
	taggedSongQuery,
} from "@/utils/supabase";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const SlidePage = () => {
	const { songId, stepNumber, setlistId } = useParams();
	const [strophes, setStrophes] = useState<Strophe[]>([]);
	const [setlistLength, setSetlistLength] = useState(0);
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

	useEffect(() => {
		if (setlistId)
			setlistLengthQuery(setlistId).then(({ data }) => {
				if (data) setSetlistLength(data[0].position);
			});
	}, [setlistId]);

	// Load songs from URL params or slide controller state
	useEffect(() => {
		console.log("[SlidePage] 🔄 Song loading useEffect triggered:", {
			songId,
			setlistId,
			stepNumber,
			"slideState.currentSongId": slideState.currentSongId,
		});

		// Priority 1: If there's a songId in the URL, load that song and update slide state
		if (songId) {
			const songIdNum = Number(songId);
			console.log("[SlidePage] 📖 Loading from URL songId:", songIdNum);
			taggedSongQuery(songIdNum).then(({ data, error }) => {
				if (data?.strophes) {
					console.log("[SlidePage] ✅ Song loaded successfully:", {
						songId: songIdNum,
						strophesCount: data.strophes.length,
					});
					setStrophes(data.strophes);
					// Update slide state to match URL
					if (slideState.currentSongId !== songIdNum) {
						console.log("[SlidePage] 🔀 Syncing slideState with URL (calling navigateToSong)");
						navigateToSong(songIdNum);
					} else {
						console.log("[SlidePage] ✓ slideState already in sync with URL");
					}
				} else {
					console.log("[SlidePage] ❌ Failed to load song:", error);
					setStrophes([]);
					const errorMessage =
						error?.code === "PGRST116"
							? "Morceau non trouvé !"
							: "Connexion à internet requise";
					toast.error(errorMessage, {
						style: {
							backgroundColor: "black",
							color: "white",
						},
					});
				}
			});
			return;
		}

		// Priority 2: If no URL songId but we have slide state, use that (for MQTT remote control)
		if (slideState.currentSongId) {
			console.log("[SlidePage] 📖 Loading from slideState.currentSongId:", slideState.currentSongId);
			taggedSongQuery(slideState.currentSongId).then(({ data, error }) => {
				if (data?.strophes) {
					console.log("[SlidePage] ✅ Song loaded from state:", {
						songId: slideState.currentSongId,
						strophesCount: data.strophes.length,
					});
					setStrophes(data.strophes);
				} else {
					console.log("[SlidePage] ❌ Failed to load song from state:", error);
					setStrophes([]);
					const errorMessage =
						error?.code === "PGRST116"
							? "Morceau non trouvé !"
							: "Connexion à internet requise";
					toast.error(errorMessage, {
						style: {
							backgroundColor: "black",
							color: "white",
						},
					});
				}
			});
			return;
		}
		if (setlistId && stepNumber) {
			// showing the page in the context of a set
			taggedSongFromSetlistStepQuery(setlistId, Number(stepNumber)).then(
				({ data }) => {
					if (data?.songs) {
						setStrophes(data.songs.strophes);
						setIsTextSlide(false);
						toast(data.songs.title, {
							position: "top-center",
							style: {
								backgroundColor: "black",
								color: "white",
							},
						});
					} else {
						// This setlist item is either a text or inline text - show cross
						setStrophes([]);
						setIsTextSlide(true);
						if (data?.texts) {
							toast(data.texts.title, {
								position: "top-center",
								style: {
									backgroundColor: "black",
									color: "white",
								},
							});
						} else if (data?.text) {
							toast("Texte libre", {
								position: "top-center",
								style: {
									backgroundColor: "black",
									color: "white",
								},
							});
						} else {
							toast("Texte", {
								position: "top-center",
								style: {
									backgroundColor: "black",
									color: "white",
								},
							});
						}
					}
				},
			);
		}
	}, [songId, setlistId, stepNumber, slideState.currentSongId, navigateToSong]);

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
					console.log("[SlidePage] ✅ Navigating to strophe:", payload.stropheIndex);
					navigateToStrophe(payload.stropheIndex);
				} else {
					console.log("[SlidePage] ⏭️ Ignoring strophe change (already at position or different song)");
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
					console.log("[SlidePage] ⏭️ Ignoring logo toggle (already in desired state)");
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

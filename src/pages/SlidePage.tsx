import type { Strophe } from "@/assets/types";
import {
	SlideFinder,
	SlideHelp,
	SlideViewer,
	TouchScreenListener,
	slideHelpAtom,
} from "@/components";
import { useSlideController } from "@/hooks/useSlideController";
import supabase, {
	setlistLengthQuery,
	taggedSongFromSetlistStepQuery,
	taggedSongQuery,
} from "@/utils/supabase";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

type NavigationEvent = {
	payload: { order: "NEXT" | "PREVIOUS" };
};

type LogoEvent = {
	payload: { isLogoSlide: boolean };
};

type SongChangeEvent = {
	payload: { songId: number; stropheIndex: number };
};

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
	} = useSlideController("slideshow");
	const { currentStropheIndex, isLogoSlide } = slideState;

	useEffect(() => {
		if (setlistId)
			setlistLengthQuery(setlistId).then(({ data }) => {
				if (data) setSetlistLength(data[0].position);
			});
	}, [setlistId]);

	// Load songs from URL params or slide controller state
	useEffect(() => {
		// Check if we should load from slide controller state
		if (
			slideState.currentSongId &&
			(!songId || Number(songId) !== slideState.currentSongId)
		) {
			taggedSongQuery(slideState.currentSongId).then(({ data, error }) => {
				if (data?.strophes) {
					setStrophes(data.strophes);
				} else {
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

		// Fallback to URL params if no slide controller state
		if (songId) {
			taggedSongQuery(Number(songId)).then(({ data, error }) => {
				if (data?.strophes) {
					setStrophes(data.strophes);
				} else {
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
	}, [songId, setlistId, stepNumber, slideState.currentSongId]);

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
		let channel = supabase.channel("remote");

		const subscribeToChannel = () => {
			// Unsubscribe first to avoid duplicate subscription errors
			channel.unsubscribe();

			// Create a new channel instance
			channel = supabase.channel("remote");

			channel
				.on("broadcast", { event: "click" }, ({ payload }: NavigationEvent) => {
					if (payload.order === "NEXT") handleNextStrophe();
					if (payload.order === "PREVIOUS") handlePrevStrophe();
				})
				.on("broadcast", { event: "logo_toggle" }, ({ payload }: LogoEvent) => {
					// Update slide controller to match remote logo state
					if (payload.isLogoSlide !== isLogoSlide) {
						toggleLogoSlide();
					}
				})
				.on(
					"broadcast",
					{ event: "song_change" },
					({ payload }: SongChangeEvent) => {
						// Navigate to the song sent from remote
						navigateToSong(payload.songId);
					},
				)
				.subscribe();
		};

		// Initial subscription
		subscribeToChannel();

		// Listen for online event to resubscribe
		const handleOnline = () => {
			console.log("Connection restored, resubscribing to channel");
			subscribeToChannel();
		};

		window.addEventListener("online", handleOnline);

		return () => {
			window.removeEventListener("online", handleOnline);
			channel.unsubscribe();
		};
	}, [
		handleNextStrophe,
		handlePrevStrophe,
		toggleLogoSlide,
		navigateToSong,
		isLogoSlide,
	]);

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

		// request for screen to keep awake : does not work on iOS PWAs
		let wakeLock: WakeLockSentinel | null = null;
		const requestWakeLock = async () => {
			try {
				wakeLock = await navigator.wakeLock.request("screen");
			} catch (err) {
				console.error(`Failed to request wake lock: ${err}`);
			}
		};
		requestWakeLock();
		const handleQuit = () => {
			if (!document.fullscreenElement) navigate("/");
		};
		document.addEventListener("fullscreenchange", handleQuit);
		return () => {
			document.removeEventListener("keydown", handleKey);
			document.removeEventListener("fullscreenchange", handleQuit);
			wakeLock?.release();
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

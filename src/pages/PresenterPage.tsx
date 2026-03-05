import type { Strophe } from "@/assets/types";
import {
	PageHeader,
	SlideViewer,
	SongPicker,
	SongPickerInline,
} from "@/components";
import {
	useSetlistLength,
	useSetlistStepCached,
} from "@/hooks/queries/useSetlistQueries";
import { useTaggedSong } from "@/hooks/queries/useSongQueries";
import { useMqttConnectionStatus } from "@/hooks/useMqttConnectionStatus";
import { useSlideStateMachine } from "@/hooks/useSlideStateMachine";
import { useWakeLock } from "@/hooks/useWakeLock";
import { taggedSongQuery } from "@/utils/supabase";
import {
	BeakerIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	EyeSlashIcon,
	MusicalNoteIcon,
	PlayIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

const PresenterPage = () => {
	const { setlistId, stepNumber } = useParams();
	const [slideshowWindow, setSlideshowWindow] = useState<Window | null>(null);
	const [showMobileSongPicker, setShowMobileSongPicker] = useState(false);

	const { state, dispatch } = useSlideStateMachine("presenter");

	// Derive strophes and indices from state
	const strophes: Strophe[] =
		state.mode === "song" || state.mode === "logo" ? state.strophes : [];
	const currentStropheIndex =
		state.mode === "song" || state.mode === "logo" ? state.stropheIndex : 0;
	const isLogoSlide = state.mode === "logo";
	const currentSongId =
		state.mode === "song"
			? state.songId
			: state.mode === "logo"
				? state.songId
				: null;

	// Monitor MQTT connection status
	useMqttConnectionStatus({ position: "top-center" });

	// Keep screen awake during presentation
	useWakeLock();

	// Load setlist length via query
	const { data: setlistLength = 0 } = useSetlistLength(setlistId);

	// Load initial song from URL params via query (cache-first, prefetched at app startup)
	const { data: stepData } = useSetlistStepCached(
		setlistId,
		stepNumber ? Number(stepNumber) : undefined,
	);

	// Navigate to initial setlist step song when data loads
	useEffect(() => {
		if (stepData?.songs) {
			dispatch({
				type: "LOAD_SONG",
				songId: stepData.songs.id,
				strophes: stepData.songs.strophes,
				setlistContext: setlistId
					? {
							setlistId,
							stepNumber: Number(stepNumber),
							totalSteps: setlistLength,
						}
					: undefined,
			});
			toast.success(`Loaded: ${stepData.songs.title}`, {
				position: "top-center",
			});
		}
	}, [stepData, setlistId, stepNumber, setlistLength, dispatch]);

	// Load strophes when current song changes (via sync from localStorage)
	// Only fetch if state has the songId but no strophes (deserialized from sync)
	const needsFetch =
		currentSongId !== null && strophes.length === 0 && state.mode !== "idle";
	const { data: currentSongData, error: currentSongError } = useTaggedSong(
		needsFetch ? currentSongId ?? undefined : undefined,
	);

	useEffect(() => {
		if (currentSongData?.strophes && currentSongId) {
			dispatch({
				type: "LOAD_SONG",
				songId: currentSongId,
				strophes: currentSongData.strophes,
			});
		} else if (currentSongId && currentSongError) {
			toast.error("Internet connection required");
		}
	}, [currentSongData, currentSongError, currentSongId, dispatch]);

	// Launch slideshow window
	const openSlideshow = useCallback(async () => {
		if (slideshowWindow && !slideshowWindow.closed) {
			slideshowWindow.focus();
			return;
		}

		let windowFeatures =
			"toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=yes";

		try {
			if ("getScreenDetails" in window) {
				// @ts-ignore - New Screen API
				const screenDetails = await window.getScreenDetails();
				const screens = screenDetails.screens;

				if (screens.length > 1) {
					const externalScreen =
						screens.find(
							(screen: { isPrimary: boolean }) => !screen.isPrimary,
						) || screens[1];
					if (externalScreen) {
						windowFeatures += `,width=${externalScreen.availWidth},height=${externalScreen.availHeight},left=${externalScreen.left},top=${externalScreen.top}`;
					}
				} else {
					windowFeatures += ",width=1920,height=1080,left=0,top=0";
				}
			} else {
				const totalWidth = window.screen.availWidth;
				const screenWidth = window.screen.width;

				if (totalWidth > screenWidth) {
					windowFeatures += `,width=${screenWidth},height=${window.screen.availHeight},left=${screenWidth},top=0`;
				} else {
					windowFeatures += ",width=1920,height=1080,left=0,top=0";
				}
			}
		} catch {
			windowFeatures += ",width=1920,height=1080,left=0,top=0";
		}

		const newWindow = window.open("/slides", "slideshow", windowFeatures);

		setTimeout(() => {
			if (
				!newWindow ||
				newWindow.closed ||
				typeof newWindow.closed === "undefined"
			) {
				const useCurrentTab = confirm(
					"Le navigateur bloque les fenêtres pop-up. Voulez-vous ouvrir le diaporama dans cet onglet ? (Sinon, autorisez les pop-ups et réessayez)",
				);
				if (useCurrentTab) {
					window.location.href = "/slides";
				}
				return;
			}

			setSlideshowWindow(newWindow);

			newWindow.addEventListener("load", () => {
				const requestFullscreenOnInteraction = () => {
					newWindow.document.documentElement
						.requestFullscreen?.()
						.catch(() => {});
					newWindow.document.removeEventListener(
						"click",
						requestFullscreenOnInteraction,
					);
					newWindow.document.removeEventListener(
						"keydown",
						requestFullscreenOnInteraction,
					);
				};

				newWindow.document.documentElement.requestFullscreen?.().catch(() => {
					newWindow.document.addEventListener(
						"click",
						requestFullscreenOnInteraction,
					);
					newWindow.document.addEventListener(
						"keydown",
						requestFullscreenOnInteraction,
					);

					const instruction = newWindow.document.createElement("div");
					instruction.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 18px;
            text-align: center;
            z-index: 9999;
            pointer-events: none;
          `;
					instruction.textContent =
						"Cliquez ou appuyez sur une touche pour passer en plein écran";
					newWindow.document.body.appendChild(instruction);

					setTimeout(() => {
						if (instruction.parentNode) {
							instruction.parentNode.removeChild(instruction);
						}
					}, 3000);
				});
			});
		}, 100);
	}, [slideshowWindow]);

	// Handle song selection from inline picker
	const handleSongSelect = useCallback(
		async (songId: number) => {
			const { data } = await taggedSongQuery(songId);
			if (data?.strophes) {
				dispatch({
					type: "LOAD_SONG",
					songId,
					strophes: data.strophes,
				});
			}
		},
		[dispatch],
	);

	// Handle song selection from mobile modal
	const handleMobileSongSelect = useCallback(
		(songId?: number) => {
			setShowMobileSongPicker(false);
			if (songId) {
				handleSongSelect(songId);
			}
		},
		[handleSongSelect],
	);

	// Navigation helpers
	const canGoNext = currentStropheIndex < strophes.length - 1;
	const canGoPrev = currentStropheIndex > 0;

	const currentStrophe = strophes[currentStropheIndex];
	const nextStropheData = strophes[currentStropheIndex + 1];

	// Progress calculation
	const totalSlides = strophes.length;
	const currentSlideNumber = currentStropheIndex + 1;

	// Keyboard controls
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.contentEditable === "true"
			) {
				return;
			}

			// Number keys focus song picker search
			if (e.key >= "0" && e.key <= "9") {
				const searchInput = document.getElementById("song-picker-search");
				if (searchInput) {
					searchInput.focus();
					return;
				}
			}

			if (e.key === "ArrowRight") {
				e.preventDefault();
				if (canGoNext) {
					dispatch({ type: "NEXT_STROPHE" });
				}
			}
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				if (canGoPrev) {
					dispatch({ type: "PREV_STROPHE" });
				}
			}
			if (e.key === "t" || e.key === "T") {
				e.preventDefault();
				dispatch({ type: "TOGGLE_LOGO" });
			}
		};

		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [canGoNext, canGoPrev, dispatch]);

	return (
		<div className="bg-white dark:bg-gray-800 h-screen flex flex-col">
			{/* Header */}
			<PageHeader
				variant="detail"
				title="Mode Présentateur"
				right={
					<>
						{/* Desktop button */}
						<button
							type="button"
							onClick={openSlideshow}
							data-testid="launch-slideshow-btn"
							className="hidden md:flex bg-jubilateBlue-500 hover:bg-jubilateBlue-700 text-white px-4 py-2 rounded-md items-center gap-2"
						>
							<PlayIcon className="w-5 h-5" />
							{slideshowWindow && !slideshowWindow.closed
								? "Afficher"
								: "Lancer"}{" "}
							Diaporama
						</button>

						{/* Mobile button */}
						<div className="md:hidden">
							<button
								type="button"
								onClick={() => setShowMobileSongPicker(true)}
								className="bg-gray-500 hover:bg-gray-700 text-white p-2 rounded-md"
								title="Choisir un chant"
							>
								<MusicalNoteIcon className="w-5 h-5" />
							</button>
						</div>
					</>
				}
			/>

			{/* Beta Disclaimer */}
			<div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-4 py-1.5 text-sm">
				<BeakerIcon className="w-4 h-4 shrink-0" />
				<span>Fonctionnalité en bêta — des bugs peuvent survenir.</span>
			</div>

			{/* Main Content */}
			<div className="flex grow min-h-0">
				{/* Left Panel: Song Picker - 1/3 width */}
				<div className="hidden md:block w-1/3 border-r border-gray-200 dark:border-gray-700">
					<SongPickerInline onSongSelect={handleSongSelect} />
				</div>

				{/* Right Panel: Slides and Controls */}
				<div className="flex-1 flex flex-col p-6 h-full">
					{/* Setlist Info */}
					{setlistId && stepNumber && (
						<div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
							Chant {stepNumber}/{setlistLength}
						</div>
					)}

					{/* Slides Side by Side */}
					<div className="flex-1 grid grid-rows-5 gap-6 min-h-0">
						{/* Current Slide */}
						<div className="row-span-3 flex justify-center">
							<div className="bg-black rounded-lg flex items-center justify-center text-white relative overflow-hidden aspect-video h-full max-w-full">
								{isLogoSlide ? (
									<>
										{currentStrophe && (
											<div className="absolute inset-0 flex items-center justify-center opacity-30">
												<SlideViewer strophe={currentStrophe} />
											</div>
										)}
										<img
											src="/svg/Jubilate_Croix.svg"
											alt="logo"
											className="size-24 relative z-10"
										/>
									</>
								) : !currentStrophe ? (
									<img
										src="/svg/Jubilate_Croix.svg"
										alt="logo"
										className="size-24"
									/>
								) : (
									<SlideViewer strophe={currentStrophe} />
								)}
							</div>
						</div>
						{/* Next Slide */}
						<div className="row-span-2 flex justify-center">
							<div className="bg-black rounded-lg flex justify-center items-center text-white aspect-video h-full max-w-full overflow-clip">
								{nextStropheData ? (
									<SlideViewer strophe={nextStropheData} />
								) : (
									<div className="text-gray-400 text-center">
										<EyeSlashIcon className="w-12 h-12 mx-auto mb-2" />
										<p>Aucune diapositive suivante</p>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Progress Bar */}
					<div className="py-4 shrink-0">
						<div className="flex items-center justify-center gap-4">
							<span className="text-sm text-gray-600 dark:text-gray-400">
								{totalSlides > 0
									? `${currentSlideNumber}/${totalSlides}`
									: "Aucune diapositive"}
							</span>
							{totalSlides > 0 && (
								<div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
									<div
										className="bg-jubilateBlue-500 h-3 rounded-full transition-all duration-300"
										style={{
											width: `${(currentSlideNumber / totalSlides) * 100}%`,
										}}
									/>
								</div>
							)}
						</div>
					</div>

					{/* Controls at Bottom */}
					<div className="shrink-0">
						<div className="flex items-center justify-center gap-6">
							<button
								type="button"
								onClick={() => dispatch({ type: "PREV_STROPHE" })}
								disabled={!canGoPrev}
								data-testid="prev-strophe-btn"
								className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-4 rounded-full transition-colors"
								title="Précédent (←)"
							>
								<ChevronLeftIcon className="w-6 h-6" />
							</button>

							<button
								type="button"
								onClick={() => dispatch({ type: "TOGGLE_LOGO" })}
								className={`p-3 rounded-full transition-colors ${
									isLogoSlide
										? "bg-yellow-500 hover:bg-yellow-600 text-white"
										: "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300"
								}`}
								title="Afficher/Masquer Logo (T)"
							>
								<img
									src="/svg/Jubilate_Croix.svg"
									alt="logo toggle"
									className="w-7 h-7"
								/>
							</button>

							<button
								type="button"
								onClick={() => dispatch({ type: "NEXT_STROPHE" })}
								disabled={!canGoNext}
								data-testid="next-strophe-btn"
								className="bg-jubilateBlue-500 hover:bg-jubilateBlue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-4 rounded-full transition-colors"
								title="Suivant (→)"
							>
								<ChevronRightIcon className="w-6 h-6" />
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile Song Picker Modal */}
			{showMobileSongPicker && (
				<SongPicker handleClose={handleMobileSongSelect} />
			)}
		</div>
	);
};

export { PresenterPage };

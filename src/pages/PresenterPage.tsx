import type { Strophe } from "@/assets/types";
import {
	BackButton,
	SlideViewer,
	SongPicker,
	SongPickerInline,
} from "@/components";
import {
	useSetlistLength,
	useSetlistStep,
} from "@/hooks/queries/useSetlistQueries";
import { useTaggedSong } from "@/hooks/queries/useSongQueries";
import { useMqttConnectionStatus } from "@/hooks/useMqttConnectionStatus";
import { useSlideController } from "@/hooks/useSlideController";
import { useWakeLock } from "@/hooks/useWakeLock";
import { taggedSongQuery } from "@/utils/supabase";
import {
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
	const [strophes, setStrophes] = useState<Strophe[]>([]);
	const [slideshowWindow, setSlideshowWindow] = useState<Window | null>(null);
	const [showMobileSongPicker, setShowMobileSongPicker] = useState(false);

	const {
		slideState,
		navigateToSong,
		nextStrophe,
		prevStrophe,
		toggleLogoSlide,
	} = useSlideController("presenter", true); // Enable network broadcast

	const { currentStropheIndex, isLogoSlide, currentSongId } = slideState;

	// Monitor MQTT connection status
	useMqttConnectionStatus({ position: "top-center" });

	// Keep screen awake during presentation
	useWakeLock();

	// Load setlist length via query
	const { data: setlistLength = 0 } = useSetlistLength(setlistId);

	// Load initial song from URL params via query
	const { data: stepData } = useSetlistStep(
		setlistId,
		stepNumber ? Number(stepNumber) : undefined,
	);

	// Navigate to initial setlist step song when data loads
	useEffect(() => {
		if (stepData?.songs) {
			setStrophes(stepData.songs.strophes);
			navigateToSong(stepData.songs.id, setlistId, Number(stepNumber));
			toast.success(`Loaded: ${stepData.songs.title}`, {
				position: "top-center",
			});
		}
	}, [stepData, setlistId, stepNumber, navigateToSong]);

	// Load strophes when current song changes (via song picker / MQTT)
	const { data: currentSongData, error: currentSongError } = useTaggedSong(
		currentSongId ?? undefined,
	);

	useEffect(() => {
		if (currentSongData?.strophes) {
			setStrophes(currentSongData.strophes);
		} else if (currentSongId && currentSongError) {
			setStrophes([]);
			toast.error("Internet connection required");
		}
	}, [currentSongData, currentSongError, currentSongId]);

	// Launch slideshow window
	const openSlideshow = useCallback(async () => {
		if (slideshowWindow && !slideshowWindow.closed) {
			slideshowWindow.focus();
			return;
		}

		// Detect second display and position window accordingly
		let windowFeatures =
			"toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=yes";

		try {
			// Try to get screen details for multi-display setup
			if ("getScreenDetails" in window) {
				// @ts-ignore - New Screen API
				const screenDetails = await window.getScreenDetails();
				const screens = screenDetails.screens;

				if (screens.length > 1) {
					// Find external display (not the primary one)
					const externalScreen =
						screens.find(
							(screen: { isPrimary: boolean }) => !screen.isPrimary,
						) || screens[1];
					if (externalScreen) {
						windowFeatures += `,width=${externalScreen.availWidth},height=${externalScreen.availHeight},left=${externalScreen.left},top=${externalScreen.top}`;
						console.log(
							`Opening slideshow on external display: ${externalScreen.availWidth}x${externalScreen.availHeight}`,
						);
					}
				} else {
					// Fallback to main screen
					windowFeatures += ",width=1920,height=1080,left=0,top=0";
				}
			} else {
				// Fallback for browsers without Screen API - try to detect second monitor
				const totalWidth = window.screen.availWidth;
				const screenWidth = window.screen.width;

				// Simple heuristic: if total available width > screen width, likely multi-monitor
				if (totalWidth > screenWidth) {
					windowFeatures += `,width=${screenWidth},height=${window.screen.availHeight},left=${screenWidth},top=0`;
					console.log(
						"Detected possible second monitor, positioning slideshow to the right",
					);
				} else {
					windowFeatures += ",width=1920,height=1080,left=0,top=0";
				}
			}
		} catch (error) {
			console.log("Screen detection failed, using default positioning:", error);
			windowFeatures += ",width=1920,height=1080,left=0,top=0";
		}

		// Chrome-compatible window opening with display-aware positioning
		const newWindow = window.open("/slides", "slideshow", windowFeatures);

		// Chrome sometimes takes a moment to create the window object
		setTimeout(() => {
			if (
				!newWindow ||
				newWindow.closed ||
				typeof newWindow.closed === "undefined"
			) {
				// Fallback: ask user to allow popups or use current tab
				const useCurrentTab = confirm(
					"Le navigateur bloque les fenêtres pop-up. Voulez-vous ouvrir le diaporama dans cet onglet ? (Sinon, autorisez les pop-ups et réessayez)",
				);
				if (useCurrentTab) {
					window.location.href = "/slides";
				}
				return;
			}

			setSlideshowWindow(newWindow);

			// Setup fullscreen request after page loads
			newWindow.addEventListener("load", () => {
				// Add a click handler to the new window that will trigger fullscreen
				// This ensures we have a user gesture required by modern browsers
				const requestFullscreenOnInteraction = () => {
					newWindow.document.documentElement
						.requestFullscreen?.()
						.catch((err) => {
							console.log("Fullscreen request failed:", err);
						});
					// Remove the listener after first use
					newWindow.document.removeEventListener(
						"click",
						requestFullscreenOnInteraction,
					);
					newWindow.document.removeEventListener(
						"keydown",
						requestFullscreenOnInteraction,
					);
				};

				// Try immediate fullscreen (may work in some browsers/contexts)
				newWindow.document.documentElement.requestFullscreen?.().catch(() => {
					// If immediate fullscreen fails, set up interaction listeners
					newWindow.document.addEventListener(
						"click",
						requestFullscreenOnInteraction,
					);
					newWindow.document.addEventListener(
						"keydown",
						requestFullscreenOnInteraction,
					);

					// Show a brief instruction to the user
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

					// Remove instruction after 3 seconds
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
			console.log(
				"[PresenterPage] 🎵 Song selected, fetching strophes for MQTT broadcast",
			);

			// Fetch the song to get first strophe content for MQTT broadcast
			const { data } = await taggedSongQuery(songId);
			const firstStrophe = data?.strophes?.[0];

			// Extract content only if it's a verse/chorus/bridge (not a section)
			const firstStropheContent =
				firstStrophe &&
				firstStrophe.type !== "section" &&
				Array.isArray(firstStrophe.content)
					? firstStrophe.content
					: undefined;

			// Preserve logo slide state when changing songs in presenter mode
			navigateToSong(
				songId,
				undefined,
				undefined,
				isLogoSlide,
				firstStropheContent,
			);
		},
		[navigateToSong, isLogoSlide],
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

	// Add keyboard controls (same as slideshow mode)
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			// Don't handle keyboard shortcuts if user is typing in an input field
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.contentEditable === "true"
			) {
				return;
			}

			// Navigation controls
			if (e.key === "ArrowRight") {
				e.preventDefault();
				if (canGoNext) {
					const nextStropheData = strophes[currentStropheIndex + 1];
					const nextStropheContent = Array.isArray(nextStropheData?.content)
						? nextStropheData.content
						: undefined;
					nextStrophe(nextStropheContent);
				}
			}
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				if (canGoPrev) {
					const prevStropheData =
						strophes[Math.max(0, currentStropheIndex - 1)];
					const prevStropheContent = Array.isArray(prevStropheData?.content)
						? prevStropheData.content
						: undefined;
					prevStrophe(prevStropheContent);
				}
			}
			// Logo toggle
			if (e.key === "t" || e.key === "T") {
				e.preventDefault();
				toggleLogoSlide();
			}
		};

		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [
		canGoNext,
		canGoPrev,
		nextStrophe,
		prevStrophe,
		toggleLogoSlide,
		strophes,
		currentStropheIndex,
	]);

	return (
		<div className="bg-white dark:bg-gray-800 h-screen flex flex-col">
			{/* Header */}
			<div className="flex justify-between items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky top-0 bg-white dark:bg-gray-900 z-10">
				<BackButton />
				<h1 className="text-2xl font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400">
					Mode Présentateur
				</h1>

				{/* Desktop button */}
				<button
					type="button"
					onClick={openSlideshow}
					data-testid="launch-slideshow-btn"
					className="hidden md:flex bg-jubilateBlue-500 hover:bg-jubilateBlue-700 text-white px-4 py-2 rounded-md items-center gap-2"
				>
					<PlayIcon className="w-5 h-5" />
					{slideshowWindow && !slideshowWindow.closed ? "Afficher" : "Lancer"}{" "}
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
										{/* Show hidden slide content in background */}
										{currentStrophe && (
											<div className="absolute inset-0 flex items-center justify-center opacity-30">
												<SlideViewer strophe={currentStrophe} />
											</div>
										)}
										{/* Logo on top */}
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
					<div className="py-4 flex-shrink-0">
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
					<div className="flex-shrink-0">
						<div className="flex items-center justify-center gap-6">
							{/* Previous Button */}
							<button
								type="button"
								onClick={() => {
									const prevStropheData =
										strophes[Math.max(0, currentStropheIndex - 1)];
									const prevStropheContent = Array.isArray(
										prevStropheData?.content,
									)
										? prevStropheData.content
										: undefined;
									prevStrophe(prevStropheContent);
								}}
								disabled={!canGoPrev}
								data-testid="prev-strophe-btn"
								className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-4 rounded-full transition-colors"
								title="Précédent (←)"
							>
								<ChevronLeftIcon className="w-6 h-6" />
							</button>

							{/* Logo Toggle */}
							<button
								type="button"
								onClick={toggleLogoSlide}
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

							{/* Next Button */}
							<button
								type="button"
								onClick={() => {
									const nextStropheData = strophes[currentStropheIndex + 1];
									const nextStropheContent = Array.isArray(
										nextStropheData?.content,
									)
										? nextStropheData.content
										: undefined;
									nextStrophe(nextStropheContent);
								}}
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

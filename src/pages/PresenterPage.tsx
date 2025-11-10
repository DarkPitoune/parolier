import type { Strophe } from "@/assets/types";
import { BackButton, SlideViewer, SongPickerInline } from "@/components";
import { useSlideController } from "@/hooks/useSlideController";
import {
  setlistLengthQuery,
  taggedSongFromSetlistStepQuery,
  taggedSongQuery,
} from "@/utils/supabase";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeSlashIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

const PresenterPage = () => {
  const { setlistId, stepNumber } = useParams();
  const [strophes, setStrophes] = useState<Strophe[]>([]);
  const [setlistLength, setSetlistLength] = useState(0);
  const [slideshowWindow, setSlideshowWindow] = useState<Window | null>(null);

  const {
    slideState,
    navigateToSong,
    nextStrophe,
    prevStrophe,
    toggleLogoSlide,
  } = useSlideController("presenter");

  const { currentStropheIndex, isLogoSlide, currentSongId } = slideState;

  // Load setlist length if in setlist context
  useEffect(() => {
    if (setlistId)
      setlistLengthQuery(setlistId).then(({ data }) => {
        if (data) setSetlistLength(data[0].position);
      });
  }, [setlistId]);

  // Load initial song from URL params
  useEffect(() => {
    if (setlistId && stepNumber) {
      taggedSongFromSetlistStepQuery(setlistId, Number(stepNumber)).then(
        ({ data }) => {
          if (data?.songs) {
            setStrophes(data.songs.strophes);
            navigateToSong(data.songs.id, setlistId, Number(stepNumber));
            toast.success(`Loaded: ${data.songs.title}`, {
              position: "top-center",
            });
          }
        },
      );
    }
  }, [setlistId, stepNumber, navigateToSong]);

  // Load strophes when current song changes
  useEffect(() => {
    if (currentSongId) {
      taggedSongQuery(currentSongId).then(({ data, error }) => {
        if (data?.strophes) {
          setStrophes(data.strophes);
        } else {
          setStrophes([]);
          const errorMessage =
            error?.code === "PGRST116"
              ? "Song not found!"
              : "Internet connection required";
          toast.error(errorMessage);
        }
      });
    }
  }, [currentSongId]);

  // Launch slideshow window
  const openSlideshow = useCallback(() => {
    if (slideshowWindow && !slideshowWindow.closed) {
      slideshowWindow.focus();
      return;
    }

    const newWindow = window.open(
      "/slides",
      "slideshow",
      "width=800,height=600,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=yes,fullscreen=yes",
    );

    if (newWindow) {
      setSlideshowWindow(newWindow);

      // Try to make it fullscreen after loading
      newWindow.addEventListener("load", () => {
        newWindow.document.body.requestFullscreen?.();
      });
    }
  }, [slideshowWindow]);

  // Handle song selection from inline picker
  const handleSongSelect = useCallback(
    (songId: number) => {
      // Preserve logo slide state when changing songs in presenter mode
      navigateToSong(songId, undefined, undefined, isLogoSlide);
    },
    [navigateToSong, isLogoSlide],
  );

  // Navigation helpers
  const canGoNext = currentStropheIndex < strophes.length - 1;
  const canGoPrev = currentStropheIndex > 0;

  const currentStrophe = strophes[currentStropheIndex];
  const nextStropheData = strophes[currentStropheIndex + 1];

  // Progress calculation
  const totalSlides = strophes.length;
  const currentSlideNumber = currentStropheIndex + 1;

  // Set 4:3 aspect ratio for slide previews

  // Add keyboard controls (same as slideshow mode)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") {
        return;
      }

      // Navigation controls
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (canGoNext) nextStrophe();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (canGoPrev) prevStrophe();
      }
      // Logo toggle
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        toggleLogoSlide();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [canGoNext, canGoPrev, nextStrophe, prevStrophe, toggleLogoSlide]);

  return (
    <div className="bg-white dark:bg-gray-800 h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky top-0 bg-white dark:bg-gray-900 z-10">
        <BackButton />
        <h1 className="text-2xl font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400">
          Mode Présentateur
        </h1>
        <button
          type="button"
          onClick={openSlideshow}
          className="bg-jubilateBlue-500 hover:bg-jubilateBlue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <PlayIcon className="w-5 h-5" />
          {slideshowWindow && !slideshowWindow.closed
            ? "Afficher"
            : "Lancer"}{" "}
          Diaporama
        </button>
      </div>

      {/* Main Content */}
      <div className="flex grow min-h-0">
        {/* Left Panel: Song Picker - 1/3 width */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
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
            <div className="row-span-3">
              <div className="bg-black rounded-lg flex items-center justify-center text-white relative overflow-hidden aspect-video h-full max-w-full">
                {isLogoSlide ? (
                  <>
                    {/* Show hidden slide content in background */}
                    {currentStrophe && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <div className="scale-50 text-3xl">
                          <SlideViewer strophe={currentStrophe} />
                        </div>
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
                  <div className="scale-50 text-3xl">
                    <SlideViewer strophe={currentStrophe} />
                  </div>
                )}
              </div>
            </div>
            {/* Next Slide */}
            <div className="row-span-2 flex justify-center">
              <div className="bg-black rounded-lg flex items-center justify-center text-white aspect-video h-full max-w-full">
                {nextStropheData ? (
                  <div className="scale-50 opacity-60 text-3xl">
                    <SlideViewer strophe={nextStropheData} />
                  </div>
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
                onClick={prevStrophe}
                disabled={!canGoPrev}
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
                onClick={nextStrophe}
                disabled={!canGoNext}
                className="bg-jubilateBlue-500 hover:bg-jubilateBlue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-4 rounded-full transition-colors"
                title="Suivant (→)"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PresenterPage };

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
	useSetlistStepCached,
} from "@/hooks/queries/useSetlistQueries";
import { useTaggedSong } from "@/hooks/queries/useSongQueries";
import { getSetlistNavAction } from "@/hooks/slideReducer";
import { useMqttConnectionStatus } from "@/hooks/useMqttConnectionStatus";
import { useSlideStateMachine } from "@/hooks/useSlideStateMachine";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
	useLocation,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router-dom";

const SlidePage = () => {
	const { songId, stepNumber, setlistId } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const startFromEnd = searchParams.get("from") === "end";
	const [slideHelp, setSlideHelp] = useAtom(slideHelpAtom);

	const { state, dispatch, localDispatch } = useSlideStateMachine("display");

	// Derive from state
	const strophes: Strophe[] =
		state.mode === "song" || state.mode === "logo" ? state.strophes : [];
	const currentStropheIndex =
		state.mode === "song" || state.mode === "logo" ? state.stropheIndex : 0;
	const isLogoSlide = state.mode === "logo";
	const isTextSlide = state.mode === "text";
	const currentSongId =
		state.mode === "song"
			? state.songId
			: state.mode === "logo"
				? state.songId
				: null;

	// Monitor MQTT connection status
	useMqttConnectionStatus({ position: "top-center" });

	// Keep screen awake during slideshow
	useWakeLock();

	// Setlist length query
	const { data: setlistLength = 0 } = useSetlistLength(setlistId);
	const setlistLengthRef = useRef(setlistLength);
	setlistLengthRef.current = setlistLength;

	// Determine which song ID to load from URL
	const songIdFromUrl = songId ? Number(songId) : undefined;

	// Load song data from URL songId or from state (after sync/deserialization with empty strophes)
	const needsFetch =
		songIdFromUrl ??
		(currentSongId && strophes.length === 0 ? currentSongId : undefined);
	const { data: songData, error: songError } = useTaggedSong(
		needsFetch ?? undefined,
	);

	// Load setlist step data (cache-first, prefetched above)
	const { data: stepData } = useSetlistStepCached(
		!songIdFromUrl ? setlistId : undefined,
		!songIdFromUrl && stepNumber ? Number(stepNumber) : undefined,
	);

	// Init from song query (URL or synced songId)
	// location.key changes on every navigation (even to the same URL), so re-selecting
	// the same song via SlideFinder re-dispatches LOAD_SONG (exits logo mode, resets strophe).
	// biome-ignore lint/correctness/useExhaustiveDependencies: location.key intentionally triggers re-dispatch on same-URL navigation
	useEffect(() => {
		if (songData?.strophes) {
			const id = songIdFromUrl ?? currentSongId;
			if (id) {
				if (songIdFromUrl) {
					// URL-driven load (SlideFinder, direct navigation): broadcast via dispatch
					dispatch({
						type: "LOAD_SONG",
						songId: id,
						strophes: songData.strophes,
						setlistContext:
							setlistId && stepNumber
								? {
										setlistId,
										stepNumber: Number(stepNumber),
										totalSteps: setlistLengthRef.current,
									}
								: undefined,
					});
				} else {
					// Sync-driven hydration: only populate strophes without changing
					// mode/stropheIndex, and don't write to localStorage.
					localDispatch({
						type: "HYDRATE_STROPHES",
						strophes: songData.strophes,
					});
				}
			}
		} else if (needsFetch && songError) {
			toast.error("Connexion à internet requise", {
				style: { backgroundColor: "black", color: "white" },
			});
		}
	}, [
		songData,
		songError,
		songIdFromUrl,
		currentSongId,
		needsFetch,
		setlistId,
		stepNumber,
		dispatch,
		localDispatch,
		location.key,
	]);

	// Init from setlist step query
	useEffect(() => {
		if (!stepData) return;
		if (stepData.songs) {
			dispatch({
				type: "LOAD_SONG",
				songId: stepData.songs.id,
				strophes: stepData.songs.strophes,
				setlistContext: setlistId
					? {
							setlistId,
							stepNumber: Number(stepNumber),
							totalSteps: setlistLengthRef.current,
						}
					: undefined,
			});
			if (startFromEnd && stepData.songs.strophes.length > 0) {
				dispatch({
					type: "GOTO_STROPHE",
					stropheIndex: stepData.songs.strophes.length - 1,
				});
			}
			toast(stepData.songs.title, {
				position: "top-center",
				style: { backgroundColor: "black", color: "white" },
			});
		} else {
			const label =
				stepData.texts?.title ?? (stepData.text ? "Texte libre" : "Texte");
			dispatch({
				type: "LOAD_TEXT",
				textTitle: label,
				setlistContext: {
					setlistId: setlistId ?? "",
					stepNumber: Number(stepNumber),
					totalSteps: setlistLengthRef.current,
				},
			});
			toast(label, {
				position: "top-center",
				style: { backgroundColor: "black", color: "white" },
			});
		}
	}, [stepData, setlistId, stepNumber, startFromEnd, dispatch]);

	const handleNextStrophe = useCallback(() => {
		const action = getSetlistNavAction(
			"next",
			state,
			setlistId,
			stepNumber,
			setlistLength,
		);
		switch (action) {
			case "dispatch":
				dispatch({ type: "NEXT_STROPHE" });
				break;
			case "next_step":
				navigate(
					`/setlists/${setlistId}/steps/${Number(stepNumber) + 1}/slide`,
					{ replace: true },
				);
				break;
		}
	}, [state, setlistId, stepNumber, setlistLength, dispatch, navigate]);

	const handlePrevStrophe = useCallback(() => {
		const action = getSetlistNavAction(
			"prev",
			state,
			setlistId,
			stepNumber,
			setlistLength,
		);
		switch (action) {
			case "dispatch":
				dispatch({ type: "PREV_STROPHE" });
				break;
			case "prev_step":
				navigate(
					`/setlists/${setlistId}/steps/${Number(stepNumber) - 1}/slide?from=end`,
					{ replace: true },
				);
				break;
		}
	}, [state, setlistId, stepNumber, setlistLength, dispatch, navigate]);

	// Arrow + strophe navigation
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight") handleNextStrophe();
			if (e.key === "ArrowLeft") handlePrevStrophe();
			if (e.key === "f" || e.key === "F") document.body.requestFullscreen();
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [handleNextStrophe, handlePrevStrophe]);

	// Global keys: help, logo toggle, quit
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") setSlideHelp((v) => !v);
			if (e.key === "t" || e.key === "T") dispatch({ type: "TOGGLE_LOGO" });
			if (e.key === "Escape" && !document.fullscreenElement) navigate(-1);
			if (e.key === "q" || e.key === "Q") document.exitFullscreen();
		};
		document.addEventListener("keydown", handleKey);

		const handleQuit = () => {
			if (!document.fullscreenElement) navigate(-1);
		};
		document.addEventListener("fullscreenchange", handleQuit);
		return () => {
			document.removeEventListener("keydown", handleKey);
			document.removeEventListener("fullscreenchange", handleQuit);
		};
	}, [navigate, setSlideHelp, dispatch]);

	return (
		<div className="absolute z-20 inset-0 flex flex-col justify-center items-center text-white bg-black overflow-clip">
			<SlideFinder />
			{isLogoSlide ||
			isTextSlide ||
			strophes[currentStropheIndex] === undefined ? (
				<img src="/svg/Jubilate_Croix.svg" alt="logo" className="size-36" />
			) : (
				<>
					<div data-testid="slide-content" className="h-full w-full">
						<SlideViewer
							key={`${songId || stepNumber}-${currentStropheIndex}`}
							strophe={strophes[currentStropheIndex]}
						/>
					</div>
					{currentStropheIndex === strophes.length - 1 && (
						<div
							data-testid="last-strophe-dot"
							className="absolute bottom-4 right-4 size-3 rounded-full bg-white opacity-60"
						/>
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

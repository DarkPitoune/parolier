import type { Strophe } from "@/assets/types";
import {
	SlideFinder,
	SlideHelp,
	SlideViewer,
	TouchScreenListener,
	slideHelpAtom,
} from "@/components";
import { setlistLengthQuery, taggedSongFromSetlistStepQuery, taggedSongQuery } from "@/utils/supabase";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const SlidePage = () => {
	const { songId, stepNumber, setlistId } = useParams();
	const [strophes, setStrophes] = useState<Strophe[]>([]);
	const [currentStropheIndex, setCurrentStropheIndex] = useState(0);
	const [setlistLength, setSetlistLength] = useState(0);
	const navigate = useNavigate();
	const [slideHelp, setSlideHelp] = useAtom(slideHelpAtom);

	useEffect(() => {
		if (setlistId)
			setlistLengthQuery(setlistId).then(({ data }) => {
				if (data) setSetlistLength(data[0].position);
			});
	}, [setlistId]);

	useEffect(() => {
		// Reset strophe index when song changes
		setCurrentStropheIndex(0);
		
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
		if (setlistId && stepNumber)
			// showing the page in the context of a set
			taggedSongFromSetlistStepQuery(setlistId, Number(stepNumber)).then(
				({ data }) => {
					if (data?.songs) {
						setStrophes(data.songs.strophes);
						toast(data.songs.title, {
							position: "top-center",
							style: {
								backgroundColor: "black",
								color: "white",
							},
						});
					} else setStrophes([]);
				},
			);
	}, [songId, setlistId, stepNumber]);

	const nextStrophe = useCallback(() => {
		if (strophes.length === 0) return;
		
		if (currentStropheIndex < strophes.length - 1) {
			setCurrentStropheIndex(currentStropheIndex + 1);
		} else if (setlistId && stepNumber && Number(stepNumber) < setlistLength) {
			navigate(`/setlists/${setlistId}/steps/${Number(stepNumber) + 1}/slide`);
		}
	}, [currentStropheIndex, navigate, setlistId, stepNumber, strophes.length, setlistLength]);

	const prevStrophe = useCallback(() => {
		if (strophes.length === 0) return;
		
		if (currentStropheIndex > 0) {
			setCurrentStropheIndex(currentStropheIndex - 1);
		} else if (setlistId && stepNumber && Number(stepNumber) > 0) {
			navigate(`/setlists/${setlistId}/steps/${Number(stepNumber) - 1}/slide`);
		}
	}, [currentStropheIndex, navigate, setlistId, stepNumber, strophes.length]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (strophes.length === 0) {
				// If no song is open, handle setlist navigation
				if (e.key === "ArrowLeft" && setlistId && stepNumber) {
					const prevStep = Number(stepNumber) - 1;
					if (prevStep > 0) navigate(`/setlists/${setlistId}/steps/${prevStep}/slide`);
				}
				if (e.key === "ArrowRight" && setlistId && stepNumber) {
					const nextStep = Number(stepNumber) + 1;
					navigate(`/setlists/${setlistId}/steps/${nextStep}/slide`);
				}
				return;
			}
			
			// If a song is open, handle strophe navigation
			if (e.key === "ArrowRight") nextStrophe();
			if (e.key === "ArrowLeft") prevStrophe();
			if (e.key === "f" || e.key === "F")
				document.body.requestFullscreen();
		};
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("keydown", handleKey);
		};
	}, [nextStrophe, prevStrophe, setlistId, stepNumber, navigate, strophes.length]);
	
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") setSlideHelp((v) => !v);
			if (e.key === "t" || e.key === "T") navigate("/slides/");
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
	}, [navigate, setSlideHelp]);

	return (
		<div className="absolute z-20 inset-0 flex flex-col justify-center items-center text-white bg-black overflow-clip">
			<SlideFinder />
			{strophes.length > 0 ? (
				<>
					<SlideViewer key={`${songId || stepNumber}-${currentStropheIndex}`} strophe={strophes[currentStropheIndex]} />
					<div className="absolute inset-0 flex items-stretch justify-stretch">
						<div className="grow" onTouchStart={prevStrophe} />
						<div className="grow" onTouchStart={nextStrophe} />
					</div>
				</>
			) : (
				<img src="/svg/Jubilate_Croix.svg" alt="logo" className="size-36" />
			)}
			{slideHelp && <SlideHelp />}
			<TouchScreenListener />
		</div>
	);
};

export { SlidePage };

import type { Strophe } from "@/assets/types";
import {
	SlideFinder,
	SlideHelp,
	slideHelpAtom,
	SlideViewer,
} from "@/components";
import { addChorus } from "@/utils/addChorus";
import { getSong } from "@/utils/supabase";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const SlideShow = () => {
	const { songId } = useParams();
	const [strophes, setStrophes] = useState<Strophe[]>([]);
	const navigate = useNavigate();
	const [slideHelp, setSlideHelp] = useAtom(slideHelpAtom);

	useEffect(() => {
		if (!songId) setStrophes([]);
		else
			getSong(songId).then(({ data }) => {
				if (data) setStrophes(addChorus(data.strophes));
				else {
					setStrophes([]);
					toast.error("Morceau non trouvé !", {
						style: {
							backgroundColor: "black",
							color: "white",
						},
					});
				}
			});
	}, [songId]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") setSlideHelp((v) => !v);
			if (e.key === "t" || e.key === "T") navigate("/slides/");
			if (e.key === "Escape" && !document.fullscreenElement) navigate("/");
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
				<SlideViewer key={songId} strophes={strophes} /> // key to fully dismount child component on song change and thus reset state
			) : (
				<img src="/svg/Jubilate_Croix.svg" alt="logo" className="size-36" />
			)}
			{slideHelp && <SlideHelp />}
		</div>
	);
};

export { SlideShow };

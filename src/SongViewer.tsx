import { Bars3Icon, ChevronLeftIcon } from "@heroicons/react/16/solid";
import { ComputerDesktopIcon } from "@heroicons/react/24/solid";
import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SlideShow } from "./SlideShow";
import type { TaggedSong } from "./assets/types";
import DynamicText from "./components/DynamicText";
import { useLeader } from "./components/LeaderContext";
import { SidePanel } from "./components/SidePanel/SidePanel";
import { addChorus } from "./utils/addChorus";
import supabase from "./utils/supabase";
import { transposeLine } from "./utils/tonalManipulation";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { addChorusAtom, showChordsAtom } from "./components/SettingsContext";

function SongViewer() {
	const { songId } = useParams();
	const [tonality, setTonality] = useState(0);
	const [song, setSong] = useState<TaggedSong>();
	const [slideShow, setSlideShow] = useState(false);
	const [open, setOpen] = useState(false);
	const { setLeaderSong, leader } = useLeader();
	const addChorusSetting = useAtomValue(addChorusAtom);
	const showChords = useAtomValue(showChordsAtom);

	useEffect(() => {
		supabase
			.from("songs")
			.select("*, tags(name, id, svg, color)")
			.eq("id", songId)
			.then(({ data }) => {
				if (data && data.length > 0) {
					setSong(data[0]);
				}
			});
		setLeaderSong(Number(songId));
	}, [songId, setLeaderSong]);

	useEffect(() => {
		const handleQuit = () => {
			if (!document.fullscreenElement) setSlideShow(false);
		};
		document.addEventListener("fullscreenchange", handleQuit);
		return () => document.removeEventListener("fullscreenchange", handleQuit);
	}, []);

	return slideShow ? (
		<SlideShow strophes={addChorus(song?.strophes || [], addChorusSetting)} />
	) : (
		<div className="bg-white dark:bg-gray-800">
			<SidePanel
				open={open}
				setOpen={setOpen}
				tonality={tonality}
				setTonality={setTonality}
			/>
			<div
				className={clsx(
					"flex justify-between items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky dark:bg-gray-900",
					leader ? "top-6" : "top-0",
				)}
			>
				<Link
					className="bg-jubilateBlue-500 dark:bg-jubilateBlue-400 rounded-full hover:bg-jubilateBlue-700"
					to="/"
				>
					<ChevronLeftIcon className="w-10 dark:fill-gray-800 fill-white" />
				</Link>

				<div className="flex items-center gap-4">
					<button
						className="rounded-full hidden md:block bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white p-3"
						type="button"
						onClick={() => {
							setSlideShow(true);
							document.body.requestFullscreen();
						}}
					>
						<ComputerDesktopIcon className="size-6 fill-white" />
					</button>
					<button
						type="button"
						onClick={() => {
							setOpen(!open);
						}}
					>
						<Bars3Icon className="w-12 fill-jubilateBlue-500 dark:fill-jubilateBlue-400 " />
					</button>
				</div>
			</div>

			{song && (
				<div className="flex flex-col gap-4 p-4">
					<div className="flex gap-4 items-center">
						<h1 className="font-flame text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
							{song.id}.
						</h1>
						<h1 className="font-flame text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
							{song.title}
						</h1>
					</div>
					<div className="flex gap-8 px-4 font-flame">
						{song.tags.map((tag) => (
							<div className="flex gap-1" key={tag.id}>
								<div
									style={{ fill: tag.color }}
									className="size-6"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: svg is in database
									dangerouslySetInnerHTML={{ __html: tag.svg }}
								/>
								<div className="font-bold" style={{ color: tag.color }}>
									{tag.name}
								</div>
							</div>
						))}
					</div>
					<div className="flex flex-col gap-4">
						{addChorus(song.strophes, addChorusSetting).map((strophe) => (
							<div
								data-type={strophe.type}
								className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold grid gap-x-2"
								style={{
									gridTemplateColumns: showChords ? "1fr 3fr" : "1fr",
								}}
								key={strophe.content[0].text} // very likely to be the number of the strophe ("1. Par toi Seigneur..")
							>
								{strophe.content.map((line, lineIndex) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
									<Fragment key={lineIndex}>
										{showChords && (
											<DynamicText
												className="bg-jubilateBlue-100 dark:bg-slate-600 outline-8 border-jubilateBlue-100 dark:border-slate-600 border-4 text-black dark:text-white"
												text={transposeLine(line.chords, tonality)}
											/>
										)}
										<DynamicText
											className=" text-black dark:text-white"
											text={line.text}
										/>
									</Fragment>
								))}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
export { SongViewer };

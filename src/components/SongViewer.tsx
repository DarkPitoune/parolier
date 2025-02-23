import type { TaggedSong } from "@/utils/supabase";
import { transposeLine } from "@/utils/tonalManipulation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/16/solid";
import { ComputerDesktopIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { Fragment, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLeader } from "./Contexts/LeaderContext";
import { addChorusAtom, showChordsAtom } from "./Contexts/SettingsContext";
import { DynamicText } from "./DynamicText";
import { SidePanel } from "./SidePanel";

function SongViewer({
	song,
	showTopBar = true,
}: { song: TaggedSong; showTopBar?: boolean }) {
	const addChorusSetting = useAtomValue(addChorusAtom);
	const showChords = useAtomValue(showChordsAtom);
	const { leader } = useLeader();
	const { stepNumber, setlistId } = useParams();
	const [tonality, setTonality] = useState(0);

	const strophes = addChorusSetting
		? song?.strophes
		: song?.strophes?.filter((strophe) => !strophe.repetition);

	return (
		<div className="bg-white dark:bg-gray-800">
			<SidePanel tonality={tonality} setTonality={setTonality} />
			{showTopBar && (
				<div
					className={clsx(
						"flex justify-between items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky bg-white dark:bg-gray-900",
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
						<Link
							className="rounded-full hidden md:block bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white p-3"
							onClick={() => document.body.requestFullscreen()}
							to={`/slides/${song?.id}`}
						>
							<ComputerDesktopIcon className="size-6 fill-white" />
						</Link>
					</div>
				</div>
			)}

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
					{song.tags?.map((tag) => (
						<div className="flex gap-1" key={tag.id}>
							<div
								style={{ fill: tag.color || "black" }}
								className="size-6"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: svg is in database
								dangerouslySetInnerHTML={{ __html: tag.svg || "" }}
							/>
							<div
								className="font-bold"
								style={{ color: tag.color || "black" }}
							>
								{tag.name}
							</div>
						</div>
					))}
				</div>
				<div className="flex flex-col gap-4">
					{strophes?.map((strophe, index) => (
						<div
							data-type={strophe.type}
							className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold grid gap-x-2"
							style={{
								gridTemplateColumns: showChords ? "1fr 3fr" : "1fr",
							}}
							// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
							key={index + strophe.content[0].text} // very likely to be the number of the strophe ("1. Par toi Seigneur..")
						>
							{strophe.content.map((line, lineIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
								<Fragment key={lineIndex}>
									{showChords && (
										<DynamicText
											className="bg-jubilateBlue-100 dark:bg-slate-600 outline-8 border-jubilateBlue-100 dark:border-slate-600 border-4 px-2 text-black dark:text-white first:rounded-t-md [&:nth-last-child(2)]:rounded-b-md"
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

			{stepNumber && (
				<div className="flex justify-center gap-4 p-4 absolute bottom-0 left-1/2 transform -translate-x-1/2">
					{Number(stepNumber) > 0 && (
						<Link
							className="bg-jubilateBlue-100 dark:bg-jubilateBlue-400 rounded-full hover:bg-jubilateBlue-300"
							to={`/setlists/${setlistId}/steps/${Number(stepNumber) - 1}`}
						>
							<ChevronLeftIcon className="w-10 dark:fill-gray-800 fill-white" />
						</Link>
					)}
					<Link
						className="bg-jubilateBlue-100 dark:bg-jubilateBlue-400 rounded-full hover:bg-jubilateBlue-300"
						to={`/setlists/${setlistId}/steps/${Number(stepNumber) + 1}`}
					>
						<ChevronRightIcon className="w-10 dark:fill-gray-800 fill-white" />
					</Link>
				</div>
			)}
		</div>
	);
}

export { SongViewer };

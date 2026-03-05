import type { TaggedSong } from "@/utils/supabase";
import { transposeLine } from "@/utils/tonalManipulation";
import { useAtomValue } from "jotai";
import { useSetAtom } from "jotai";
import { Fragment, useEffect } from "react";
import { addChorusAtom, showChordsAtom } from "./Contexts/SettingsContext";
import { tonalityAtom } from "./Contexts/SettingsContext";
import { DynamicText } from "./DynamicText";
import { TagChip } from "./TagChip";

function SongViewer({
	song,
	showTitle = false,
}: { song: TaggedSong; showTitle?: boolean }) {
	const addChorusSetting = useAtomValue(addChorusAtom);
	const showChords = useAtomValue(showChordsAtom);
	const tonality = useAtomValue(tonalityAtom);
	const setTonality = useSetAtom(tonalityAtom);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset tonality when song changes
	useEffect(() => {
		setTonality(0);
	}, [song.id, setTonality]);

	const strophes = addChorusSetting
		? song?.strophes
		: song?.strophes?.filter(
				(strophe) => strophe.type === "section" || !strophe.repetition,
			);

	return (
		<div className="bg-white dark:bg-gray-800">
			<div className="flex flex-col gap-2 lg:gap-4 p-4">
				{showTitle && (
					<div className="flex gap-4 items-center font-flame text-xl lg:text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
						<h1>{song.id}.</h1>
						<h1 className="text-center">{song.title}</h1>
					</div>
				)}
				<div className="flex gap-2 lg:gap-4 px-4 font-flame">
					{song.tags?.map((tag) => (
						<TagChip tag={tag} key={tag.id} />
					))}
				</div>
				<div className="flex flex-col gap-4 pb-10">
					{strophes?.map((strophe, index) =>
						strophe.type !== "section" ? (
							<div
								data-type={strophe.type}
								className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold grid gap-x-2"
								style={{
									gridTemplateColumns: showChords ? "1fr 3fr" : "1fr",
								}}
								// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
								key={index + (strophe.content[0]?.text ?? "")} // very likely to be the number of the strophe ("1. Par toi Seigneur..")
							>
								{strophe.content?.map((line, lineIndex) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
									<Fragment key={lineIndex}>
										{showChords && (
											<DynamicText
												className="bg-jubilateBlue-100 dark:bg-slate-600 border-jubilateBlue-100 dark:border-slate-600 border-4 px-2 text-black dark:text-white first:rounded-t-md nth-last-2:rounded-b-md"
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
						) : (
							<div className="sticky top-0" key={strophe.content}>
								{strophe.content}
							</div>
						),
					)}
				</div>
			</div>
		</div>
	);
}

export { SongViewer };

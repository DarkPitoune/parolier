import { type TaggedSong, supabaseUrl } from "@/utils/supabase";
import { transposeLine } from "@/utils/tonalManipulation";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useAtomValue } from "jotai";
import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { addChorusAtom, showChordsAtom } from "./Contexts/SettingsContext";
import { DynamicText } from "./DynamicText";
import { SettingsSidePanel } from "./SidePanel/variants/SettingsSidePanel";
import { TagChip } from "./TagChip";

function SongViewer({
	song,
	showTitle = false,
}: { song: TaggedSong; showTitle?: boolean }) {
	const addChorusSetting = useAtomValue(addChorusAtom);
	const showChords = useAtomValue(showChordsAtom);
	const [tonality, setTonality] = useState(0);

	const strophes = addChorusSetting
		? song?.strophes
		: song?.strophes?.filter(
				(strophe) => strophe.type === "section" || !strophe.repetition,
			);

	return (
		<div className="bg-white dark:bg-gray-800">
			<SettingsSidePanel
				tonality={tonality}
				setTonality={setTonality}
				song={song}
			/>
			<div className="flex flex-col gap-2 lg:gap-4 p-4">
				{showTitle && (
					<div className="flex gap-4 items-center font-flame text-xl lg:text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
						<h1>{song.id}.</h1>
						<h1 className="text-center">{song.title}</h1>
					</div>
				)}
				{song.sheet_music_url && (
					<Link
						to={`${supabaseUrl}/storage/v1/object/public${song.sheet_music_url}`}
						className="ml-auto px-4 py-2 bg-jubilateBlue-500 dark:bg-jubilateBlue-400 hover:bg-jubilateBlue-600 dark:hover:bg-jubilateBlue-300 text-white rounded-full transition-colors duration-200 flex items-center gap-2"
						title="Voir la partition"
					>
						<DocumentTextIcon className="size-6" />
					</Link>
				)}
				<div className="flex gap-2 lg:gap-4 px-4 font-flame">
					{song.tags?.map((tag) => (
						<TagChip tag={tag} key={tag.id} />
					))}
				</div>
				<div className="flex flex-col gap-4">
					{strophes?.map((strophe, index) =>
						strophe.type !== "section" ? (
							<div
								data-type={strophe.type}
								className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold grid gap-x-2"
								style={{
									gridTemplateColumns: showChords ? "1fr 3fr" : "1fr",
								}}
								// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
								key={index + strophe.content[0].text} // very likely to be the number of the strophe ("1. Par toi Seigneur..")
							>
								{strophe.content?.map((line, lineIndex) => (
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

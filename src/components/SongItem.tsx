import type { AllSongs } from "@/utils/supabase";
import clsx from "clsx";
import { DynamicText } from "./DynamicText";

export const getSongItemId = (songId: number) => `song-${songId}`;

export function SongItem({
	song,
	hover = true,
}: { song: AllSongs[number]; hover?: boolean }) {
	return (
		<div
			id={getSongItemId(song.id)}
			className={clsx(
				"px-2 py-4 print:px-0.5 print:py-1 flex items-stretch text-black dark:text-jubilateBlue-400",
				hover && "hover:bg-jubilateBlue-100 dark:hover:bg-gray-700",
			)}
		>
			<div className="w-16 justify-center font-flame text-2xl text-black dark:text-white flex items-center shrink-0">
				{song.id}
			</div>
			<DynamicText
				className="grow self-center text-black dark:text-white"
				text={song.title}
			/>
			<div className="flex gap-2 items-center">
				{song.tags.map((tag) => (
					<div
						style={{ fill: tag.color || "black" }}
						className="size-5"
						key={tag.id}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: svg is in database
						dangerouslySetInnerHTML={{ __html: tag.svg || "" }}
					/>
				))}
			</div>
		</div>
	);
}

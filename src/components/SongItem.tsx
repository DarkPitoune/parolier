import type { AllSongs } from "@/utils/supabase";
import { DynamicText } from "./DynamicText";

export function SongItem({ song }: { song: AllSongs[number] }) {
	return (
		<div className="px-2 py-4 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 flex items-stretch gap-3 text-black dark:text-jubilateBlue-400">
			<div className="w-10 justify-center border-r font-bold flex items-center">
				{song.id}
			</div>
			<DynamicText
				className="grow text-black dark:text-white"
				text={song.title}
			/>
			<div className="flex gap-2 items-center">
				{song.tags.map((tag) => (
					<div
						style={{ fill: tag.color || "black" }}
						className="size-6"
						key={tag.id}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: svg is in database
						dangerouslySetInnerHTML={{ __html: tag.svg || "" }}
					/>
				))}
			</div>
		</div>
	);
}

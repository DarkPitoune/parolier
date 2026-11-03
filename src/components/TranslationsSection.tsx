import {
	useSongTranslation,
	useTaggedSong,
	useUnlinkTranslation,
} from "@/hooks/queries/useSongQueries";
import { LinkSlashIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { LanguageBadge } from "./LanguageBadge";
import { TranslationActions } from "./TranslationActions";

/**
 * Links apply immediately through their own mutations rather than waiting for
 * the editor's Save, so it reads the song from the query cache — the editor's
 * draft copy never learns that its translation group changed.
 */
export function TranslationsSection({ songId }: { songId: number }) {
	const { data: song } = useTaggedSong(songId);
	const translation = useSongTranslation(song);
	const unlinkTranslation = useUnlinkTranslation();

	if (!song || translation === undefined) return null;

	return (
		<div className="border p-4 rounded-md border-jubilateBlue-100 dark:border-slate-500 flex flex-col gap-3">
			<h3 className="text-lg font-semibold">Traduction</h3>
			<div
				className="rounded-xl border border-jubilateBlue-200 dark:border-slate-600 overflow-hidden"
				data-testid="translation"
			>
				{translation ? (
					<div className="flex min-h-[52px] items-center gap-3 pl-3.5 pr-1.5">
						<span className="w-10 text-sm font-bold">{translation.id}</span>
						<Link
							to={`/songs/${translation.id}`}
							className="grow min-w-0 truncate"
						>
							{translation.title}
						</Link>
						<LanguageBadge language={translation.language} />
						<button
							type="button"
							onClick={() => unlinkTranslation.mutate(translation.id)}
							disabled={unlinkTranslation.isPending}
							aria-label={`Délier « ${translation.title} »`}
							title="Délier"
							className="grid size-11 place-items-center text-gray-500 dark:text-gray-400 hover:text-jubilateRed-500 disabled:opacity-50"
						>
							<LinkSlashIcon className="size-5" />
						</button>
					</div>
				) : (
					<TranslationActions song={song} />
				)}
			</div>
		</div>
	);
}

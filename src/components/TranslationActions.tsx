import type { SongLanguage } from "@/assets/types";
import {
	useAllSongs,
	useCreateTranslation,
	useLinkTranslation,
} from "@/hooks/queries/useSongQueries";
import { DocumentPlusIcon, LinkIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SongPicker } from "./SongPicker";

const ACTION =
	"flex min-h-12 flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold text-jubilateBlue-500 dark:text-jubilateBlue-400 disabled:opacity-50";

/** Link or create the translation of a song that has none yet. */
export function TranslationActions({
	song,
}: { song: { id: number; language: SongLanguage } }) {
	const { data: songs } = useAllSongs();
	const linkTranslation = useLinkTranslation();
	const createTranslation = useCreateTranslation();
	const navigate = useNavigate();
	const [pickerOpen, setPickerOpen] = useState(false);
	const otherLanguage = song.language === "en" ? "fr" : "en";

	const alreadyTranslated = useMemo(
		() => (songs ?? []).filter((s) => s.translation_group).map((s) => s.id),
		[songs],
	);

	const closePicker = (otherId?: number) => {
		setPickerOpen(false);
		if (otherId !== undefined)
			linkTranslation.mutate({ songId: song.id, otherId });
	};

	const createTranslatedSong = () => {
		const title = prompt("Titre du chant traduit");
		if (!title) return;
		createTranslation.mutate(
			{ songId: song.id, title, language: otherLanguage },
			{ onSuccess: (id) => navigate(`/songs/${id}/edit`) },
		);
	};

	return (
		<div className="flex divide-x divide-jubilateBlue-200 dark:divide-slate-600">
			<button
				type="button"
				onClick={() => setPickerOpen(true)}
				disabled={linkTranslation.isPending}
				className={ACTION}
			>
				<LinkIcon className="size-5 shrink-0" />
				Lier une traduction
			</button>
			<button
				type="button"
				onClick={createTranslatedSong}
				disabled={createTranslation.isPending}
				className={ACTION}
			>
				<DocumentPlusIcon className="size-5 shrink-0" />
				Créer le chant traduit
			</button>
			{pickerOpen && (
				<SongPicker
					handleClose={closePicker}
					excludeIds={alreadyTranslated}
					language={otherLanguage}
				/>
			)}
		</div>
	);
}

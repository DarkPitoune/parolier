import {
	CONTENT_TYPE_ICONS,
	navigationHistoryAtom,
} from "@/hooks/useNavigationHistory";
import { queryKeys } from "@/utils/queryKeys";
import { newSongMutation } from "@/utils/supabase";
import {
	BookOpenIcon,
	CalendarDaysIcon,
	ChartBarIcon,
	DocumentTextIcon,
	FireIcon,
	MusicalNoteIcon,
	PlusIcon,
	PresentationChartLineIcon,
	QueueListIcon,
	RectangleGroupIcon,
} from "@heroicons/react/16/solid";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { SidePanel } from "../../SidePanel";

export function NavigationSidePanel({
	open,
	setOpen,
}: { open: boolean; setOpen: (open: boolean) => void }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const history = useAtomValue(navigationHistoryAtom);
	const createNewSong = async () => {
		const title = prompt("Titre de la chanson");
		if (!title) return;
		const { error, data } = await newSongMutation(title);
		if (error) {
			toast.error(`Erreur lors de la création de la chanson: ${error.message}`);
		} else {
			queryClient.invalidateQueries({ queryKey: queryKeys.songs.list() });
			toast.success("Chanson créée avec succès");
			navigate(`/songs/${data.id}`);
		}
	};
	return (
		<SidePanel open={open} onClose={() => setOpen(false)} title="Navigation">
			<div className="flex flex-col gap-1">
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/"
				>
					<MusicalNoteIcon className="w-4 h-4" />
					Liste des chants
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/refrains"
				>
					<FireIcon className="w-4 h-4" />
					Refrains
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/ordinaires"
				>
					<RectangleGroupIcon className="w-4 h-4" />
					Ordinaires de messe
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/texts"
				>
					<DocumentTextIcon className="w-4 h-4" />
					Textes
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/bible"
				>
					<BookOpenIcon className="w-4 h-4" />
					Bible
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/messe"
				>
					<CalendarDaysIcon className="w-4 h-4" />
					Messe
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/setlists"
				>
					<QueueListIcon className="w-4 h-4" />
					Setlists
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/analytics"
				>
					<ChartBarIcon className="w-4 h-4" />
					Statistiques
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/presenter"
				>
					<PresentationChartLineIcon className="w-4 h-4" />
					Mode Présentateur
				</Link>
				<button
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					type="button"
					onClick={createNewSong}
				>
					<PlusIcon className="w-4 h-4" />
					Nouvelle chanson
				</button>
			</div>
			{history.length > 0 && (
				<>
					<hr className="border-gray-200 dark:border-gray-600 my-2" />
					<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-1 uppercase tracking-wide">
						Récents
					</h3>
					<div className="flex flex-col border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mx-1">
						{history.map((entry) => {
							const Icon = CONTENT_TYPE_ICONS[entry.type];
							return (
								<button
									key={entry.path}
									type="button"
									onClick={() => {
										navigate(entry.path, { state: { restoreScrollY: entry.scrollY } });
										setOpen(false);
									}}
									className="flex items-center gap-2 px-3 py-1.5 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition text-left w-full min-w-0"
								>
									<Icon className="w-4 h-4 shrink-0" />
									<span className="truncate">{entry.title}</span>
								</button>
							);
						})}
					</div>
				</>
			)}
		</SidePanel>
	);
}

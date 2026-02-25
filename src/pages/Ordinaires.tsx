import { PageHeader, SettingsSidePanel, useLeader } from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel";
import {
	useAllOrdinaires,
	useAllOrdinaireSongs,
} from "@/hooks/queries/useSongQueries";
import { queryKeys } from "@/utils/queryKeys";
import { newOrdinaireMutation } from "@/utils/supabase";
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import Fuse from "fuse.js";
import { type ChangeEventHandler, useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

const ROLE_ORDER = [
	"kyrie",
	"gloria",
	"alleluia",
	"sanctus",
	"anamnese",
	"agnus",
] as const;
const ROLE_LABELS: Record<string, string> = {
	kyrie: "Kyrie",
	gloria: "Gloria",
	alleluia: "Alleluia",
	sanctus: "Sanctus",
	anamnese: "Anamnèse",
	agnus: "Agnus Dei",
};

export function Ordinaires() {
	const { data: ordinairesData } = useAllOrdinaires();
	const { data: songsData } = useAllOrdinaireSongs();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { leader } = useLeader();
	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const ordinaires = useMemo(() => ordinairesData ?? [], [ordinairesData]);
	const songs = useMemo(() => songsData ?? [], [songsData]);

	// Group songs by ordinaire_id
	const songsByOrdinaire = useMemo(() => {
		const map = new Map<number, typeof songs>();
		for (const song of songs) {
			if (song.ordinaire_id == null) continue;
			const group = map.get(song.ordinaire_id) ?? [];
			group.push(song);
			map.set(song.ordinaire_id, group);
		}
		return map;
	}, [songs]);

	// Search across ordinaire names and song titles
	const fuse = useMemo(
		() =>
			new Fuse(
				ordinaires.map((o) => ({
					...o,
					songTitles: (songsByOrdinaire.get(o.id) ?? [])
						.map((s) => s.title)
						.join(" "),
				})),
				{ keys: ["name", "songTitles"], threshold: 0.4 },
			),
		[ordinaires, songsByOrdinaire],
	);

	const filteredOrdinaires = useMemo(() => {
		if (!searchQuery) return ordinaires;
		return fuse.search(searchQuery).map((r) => r.item);
	}, [searchQuery, ordinaires, fuse]);

	const search: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
		setSearchQuery(event.target.value);
	}, []);

	const createNewOrdinaire = async () => {
		const name = prompt("Nom de l'ordinaire");
		if (!name) return;
		const { error, data } = await newOrdinaireMutation(name);
		if (error) {
			toast.error(`Erreur lors de la création: ${error.message}`);
		} else {
			queryClient.invalidateQueries({
				queryKey: queryKeys.ordinaires.list(),
			});
			toast.success("Ordinaire créé avec succès");
			navigate(`/ordinaires/${data.id}`);
		}
	};

	const sortedSongs = (ordinaireId: number) => {
		const group = songsByOrdinaire.get(ordinaireId) ?? [];
		return [...group].sort(
			(a, b) =>
				ROLE_ORDER.indexOf(a.ordinaire_role as (typeof ROLE_ORDER)[number]) -
				ROLE_ORDER.indexOf(b.ordinaire_role as (typeof ROLE_ORDER)[number]),
		);
	};

	return (
		<div className="bg-white dark:bg-gray-800 min-h-screen">
			<SettingsSidePanel />
			<NavigationSidePanel
				open={isNavigationPanelOpen}
				setOpen={setIsNavigationPanelOpen}
			/>
			<div
				className={clsx(
					"transition-all sticky bg-white dark:bg-gray-800 print:hidden z-10",
					leader ? "top-6" : "top-0",
				)}
			>
				<PageHeader
					variant="list"
					left={
						<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
							<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
							<input
								className="w-full h-9 rounded-full px-2 outline-none bg-white dark:bg-white text-black dark:text-black"
								type="search"
								onChange={search}
								placeholder="Chercher un ordinaire..."
							/>
						</div>
					}
					right={
						<button
							type="button"
							onClick={() => setIsNavigationPanelOpen(true)}
						>
							<img className="h-12" src="/svg/logo.svg" alt="Logo" />
						</button>
					}
				/>
			</div>
			<div className="flex flex-col gap-4 p-4">
				{filteredOrdinaires.length === 0 && (
					<p className="text-center text-gray-500 dark:text-gray-400 py-8">
						Aucun ordinaire de messe
					</p>
				)}
				{filteredOrdinaires.map((ordinaire) => (
					<div
						key={ordinaire.id}
						className="rounded-lg border border-jubilateBlue-200 dark:border-gray-600 overflow-hidden"
					>
						<Link
							to={`/ordinaires/${ordinaire.id}`}
							className="flex items-center gap-2 px-4 py-3 bg-jubilateBlue-50 dark:bg-gray-700 hover:bg-jubilateBlue-100 dark:hover:bg-gray-600 transition"
						>
							<h2 className="font-flame text-lg text-jubilateBlue-500 dark:text-jubilateBlue-400">
								{ordinaire.name}
							</h2>
						</Link>
						<div className="divide-y divide-jubilateBlue-100 dark:divide-gray-600">
							{sortedSongs(ordinaire.id).map((song) => (
								<Link
									key={song.id}
									to={`/songs/${song.id}`}
									className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
								>
									<span className="text-sm font-medium text-jubilateBlue-400 dark:text-jubilateBlue-300 w-20 shrink-0">
										{ROLE_LABELS[song.ordinaire_role ?? ""] ??
											song.ordinaire_role}
									</span>
									<span className="text-black dark:text-white truncate">
										{song.title}
									</span>
								</Link>
							))}
							{sortedSongs(ordinaire.id).length === 0 && (
								<p className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
									Aucun chant ajouté
								</p>
							)}
						</div>
					</div>
				))}
			</div>
			<div className="flex justify-center py-4">
				<button
					className="px-4 py-2 bg-jubilateBlue-500 text-white rounded-full hover:bg-jubilateBlue-600 transition"
					type="button"
					onClick={createNewOrdinaire}
				>
					Nouvel ordinaire
				</button>
			</div>
		</div>
	);
}

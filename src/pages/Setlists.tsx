import { BackButton } from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel/NavigationSidePanel";
import {
	type AllSetlists,
	allSetlistsQuery,
	deleteSetlistMutation,
	newSetlistMutation,
} from "@/utils/supabase";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/16/solid";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Setlists = () => {
	const [setslists, setSetlists] = useState<AllSetlists>([]);
	const fetchSetlists = useCallback(async () => {
		const { data } = await allSetlistsQuery();
		setSetlists(data || []);
	}, []);

	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);
	const handleCreateSetlist = () => {
		newSetlistMutation().then(fetchSetlists);
	};

	const handleDeleteSetlist = async (id: number) => {
		if (!confirm("Êtes-vous sûr de vouloir supprimer cette setlist ?")) return;
		await deleteSetlistMutation(id);
		fetchSetlists();
	};

	useEffect(() => {
		fetchSetlists();
		document.title = "Setlists - Parolier";
	}, [fetchSetlists]);

	return (
		<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
			<div className="bg-jubilateBlue-500 dark:bg-slate-900 px-6 py-4 flex justify-between items-center">
				<BackButton />
				<h1 className="font-flame text-xl lg:text-3xl text-white">Setlists</h1>
				<button type="button" onClick={() => setIsNavigationPanelOpen(true)}>
					<img className="h-12" src="/svg/logo.svg" alt="Logo" />
				</button>
				<NavigationSidePanel
					open={isNavigationPanelOpen}
					setOpen={setIsNavigationPanelOpen}
				/>
			</div>
			<div className="flex flex-col items-stretch divide-y">
				{setslists?.map((setlist) => (
					<div
						key={setlist.id}
						className="px-2 py-4 text-black dark:text-white hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 flex items-center gap-3 relative overflow-clip"
					>
						<Link className="grow" to={`/setlists/${setlist.id}`}>
							{setlist.name}
						</Link>
						<button
							type="button"
							onClick={() => handleDeleteSetlist(setlist.id)}
						>
							<TrashIcon className="size-8 rounded-full bg-jubilateRed p-1" />
						</button>
						<Link to={`/setlists/${setlist.id}/edit`}>
							<PencilSquareIcon className="size-8 p-1 bg-jubilateGreen rounded-full" />
						</Link>
					</div>
				))}
				<button
					type="button"
					onClick={handleCreateSetlist}
					className="px-2 py-2 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 dark:text-slate-400 italic text-slate-400"
				>
					Créer une setlist
				</button>
			</div>
		</div>
	);
};

export { Setlists };

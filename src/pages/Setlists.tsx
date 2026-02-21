import { BackButton } from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel/NavigationSidePanel";
import { useAllSetlists } from "@/hooks/queries/useSetlistQueries";
import { queryKeys } from "@/utils/queryKeys";
import { deleteSetlistMutation, newSetlistMutation } from "@/utils/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/16/solid";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Setlists = () => {
	const { data: setslists = [] } = useAllSetlists();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);

	const createMutation = useMutation({
		mutationFn: () => newSetlistMutation(),
		onSuccess: ({ data }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.setlists.list() });
			if (data) navigate(`/setlists/${data.id}/edit`);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => deleteSetlistMutation(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.setlists.list() });
		},
	});

	const handleDeleteSetlist = (id: number) => {
		if (!confirm("Êtes-vous sûr de vouloir supprimer cette setlist ?")) return;
		deleteMutation.mutate(id);
	};

	useEffect(() => {
		document.title = "Setlists - Parolier";
	}, []);

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
							disabled={deleteMutation.isPending}
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
					onClick={() => createMutation.mutate()}
					disabled={createMutation.isPending}
					className="px-2 py-2 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 dark:text-slate-400 italic text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{createMutation.isPending
						? "Création en cours..."
						: "Créer une setlist"}
				</button>
			</div>
		</div>
	);
};

export { Setlists };

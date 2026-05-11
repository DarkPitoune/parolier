import { PageHeader } from "@/components";
import { globalSearchEnabledAtom } from "@/components/Contexts/SettingsContext";
import { UnifiedSearch } from "@/components/UnifiedSearch/UnifiedSearch";
import { useAllSetlists } from "@/hooks/queries/useSetlistQueries";
import { queryKeys } from "@/utils/queryKeys";
import { deleteSetlistMutation, newSetlistMutation } from "@/utils/supabase";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/16/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const Setlists = () => {
	const { data: setslists = [] } = useAllSetlists();
	const globalSearchEnabled = useAtomValue(globalSearchEnabledAtom);
	const queryClient = useQueryClient();
	const navigate = useNavigate();

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
			<PageHeader
				variant="list"
				title={globalSearchEnabled ? undefined : "Setlists"}
				left={
					globalSearchEnabled ? (
						<UnifiedSearch
							currentSection="setlists"
							placeholder="Rechercher une setlist..."
						/>
					) : undefined
				}
			/>
			<div className="flex flex-col items-stretch divide-y">
				{setslists?.map((setlist) => (
					<div
						key={setlist.id}
						className="px-2 text-black dark:text-white hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 flex items-center gap-3 relative overflow-clip"
					>
						<Link className="grow py-4" to={`/setlists/${setlist.id}`}>
							{setlist.name}
						</Link>
						<button
							type="button"
							onClick={() => handleDeleteSetlist(setlist.id)}
							disabled={deleteMutation.isPending}
						>
							<TrashIcon className="size-9 rounded-full bg-jubilateRed p-2 fill-stone-800" />
						</button>
						<Link to={`/setlists/${setlist.id}/edit`}>
							<PencilSquareIcon className="size-9 p-2 bg-jubilateGreen rounded-full fill-stone-800" />
						</Link>
					</div>
				))}
				<button
					type="button"
					onClick={() => createMutation.mutate()}
					disabled={createMutation.isPending}
					className="flex items-center place-self-center gap-2 px-4 py-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-600 disabled:opacity-50 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

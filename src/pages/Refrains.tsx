import { PageHeader, SongItem, useLeader } from "@/components";
import {
	UnifiedSearchInput,
	UnifiedSearchResults,
} from "@/components/UnifiedSearch/UnifiedSearch";
import { useUnifiedSearch } from "@/components/UnifiedSearch/useUnifiedSearch";
import { useAllRefrains } from "@/hooks/queries/useSongQueries";
import { queryKeys } from "@/utils/queryKeys";
import { newRefrainMutation } from "@/utils/supabase";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

export function Refrains() {
	const { data: refrainsData } = useAllRefrains();
	const queryClient = useQueryClient();

	const refrains = useMemo(
		() => (refrainsData ? [...refrainsData].sort((a, b) => a.id - b.id) : []),
		[refrainsData],
	);

	const unifiedSearch = useUnifiedSearch("refrains");
	const navigate = useNavigate();
	const { leader } = useLeader();

	const createNewRefrain = async (suggestedTitle?: string) => {
		const title = prompt("Titre du refrain", suggestedTitle ?? "");
		if (!title) return;
		const { error, data } = await newRefrainMutation(title);
		if (error) {
			toast.error(`Erreur lors de la création du refrain: ${error.message}`);
		} else {
			queryClient.invalidateQueries({
				queryKey: queryKeys.songs.refrainList(),
			});
			toast.success("Refrain créé avec succès");
			navigate(`/songs/${data.id}`);
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800">
			<div
				className={clsx(
					"transition-all sticky bg-white dark:bg-gray-800 print:hidden",
					leader ? "top-6" : "top-0",
				)}
			>
				<PageHeader
					variant="list"
					left={
						<UnifiedSearchInput
							search={unifiedSearch}
							placeholder="Chercher un refrain..."
						/>
					}
				/>
			</div>
			{unifiedSearch.showResults ? (
				<UnifiedSearchResults
					search={unifiedSearch}
					onCreateRefrain={createNewRefrain}
				/>
			) : (
				<>
					<div
						className="flex flex-col items-stretch px-2 divide-y divide-jubilateBlue-300 dark:bg-gray-800 print:block print:p-0"
						style={{ columnCount: 2 }}
					>
						{refrains.map((refrain) => (
							<Link key={refrain.id} to={`/songs/${refrain.id}`}>
								<SongItem song={refrain} />
							</Link>
						))}
					</div>
					<div className="flex justify-center py-4">
						<button
							className="px-4 py-2 bg-jubilateBlue-500 text-white rounded-full hover:bg-jubilateBlue-600 transition"
							type="button"
							onClick={() => createNewRefrain()}
						>
							Nouveau refrain
						</button>
					</div>
				</>
			)}
		</div>
	);
}

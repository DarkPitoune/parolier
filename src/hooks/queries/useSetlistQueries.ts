import { queryKeys } from "@/utils/queryKeys";
import { sortSetlistItems } from "@/utils/setlistOrder";
import {
	type AllSetlistItems,
	type Setlist,
	allSetlistItemsQuery,
	allSetlistsQuery,
	setlistHistoryQuery,
	setlistItemShowTextOnSlideMutation,
	setlistItemsQuery,
	setlistQuery,
} from "@/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import toast from "react-hot-toast";

export const useAllSetlists = () =>
	useQuery({
		queryKey: queryKeys.setlists.list(),
		queryFn: async () => {
			const { data, error } = await allSetlistsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 0, // always refetch
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
	});

export const useSetlist = (setlistId: string | undefined) =>
	useQuery({
		queryKey: queryKeys.setlists.detail(setlistId as string),
		queryFn: async () => {
			const { data, error } = await setlistQuery(setlistId as string);
			if (error) throw error;
			return data;
		},
		enabled: !!setlistId,
		staleTime: 0,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
	});

export const useSetlistHistory = () =>
	useQuery({
		queryKey: queryKeys.setlists.history(),
		queryFn: async () => {
			const { data, error } = await setlistHistoryQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
	});

/**
 * Prefetches ALL setlist items in a single bulk query and seeds each setlist's
 * ordered item list into the TanStack Query cache. Call once at app startup.
 * After this resolves, every useSetlistItemsCached call is instant (cache hit).
 */
export const usePrefetchAllSetlistItems = () => {
	const queryClient = useQueryClient();

	useEffect(() => {
		const prefetch = async () => {
			try {
				const { data, error } = await allSetlistItemsQuery();
				if (error || !data) return;

				const bySetlist = new Map<string, AllSetlistItems>();
				for (const item of data) {
					if (!item.setlist_id) continue;
					const setlistId = String(item.setlist_id);
					const group = bySetlist.get(setlistId);
					if (group) group.push(item);
					else bySetlist.set(setlistId, [item]);
				}

				for (const [setlistId, items] of bySetlist) {
					queryClient.setQueryData(
						queryKeys.setlists.items(setlistId),
						sortSetlistItems(items),
					);
				}
			} catch {
				// Silent failure — offline or bad network, SW cache will serve
			}
		};

		prefetch();
	}, [queryClient]);
};

/**
 * Cache-first ordered items of one setlist, for presentation mode. A setlist
 * step is an index into this array (see sortSetlistItems).
 * Serves from cache immediately (prefetched by usePrefetchAllSetlistItems),
 * won't refetch on focus/reconnect to avoid jank during presentation.
 */
export const useSetlistItemsCached = (setlistId: string | undefined) =>
	useQuery({
		queryKey: queryKeys.setlists.items(setlistId as string),
		queryFn: async () => {
			const { data, error } = await setlistItemsQuery(setlistId as string);
			if (error) throw error;
			return sortSetlistItems(data ?? []);
		},
		enabled: !!setlistId,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

export const useSetShowTextOnSlide = (setlistId: string | undefined) => {
	const queryClient = useQueryClient();
	const detailKey = queryKeys.setlists.detail(setlistId as string);

	return useMutation({
		mutationFn: async ({
			itemId,
			showTextOnSlide,
		}: {
			itemId: number;
			showTextOnSlide: boolean;
		}) => {
			const { error } = await setlistItemShowTextOnSlideMutation(
				setlistId as string,
				itemId,
				showTextOnSlide,
			);
			if (error) throw error;
		},
		onMutate: async ({ itemId, showTextOnSlide }) => {
			await queryClient.cancelQueries({ queryKey: detailKey, exact: true });
			const previous = queryClient.getQueryData<Setlist>(detailKey);
			queryClient.setQueryData<Setlist>(detailKey, (items) =>
				items?.map((item) =>
					item.id === itemId
						? { ...item, show_text_on_slide: showTextOnSlide }
						: item,
				),
			);
			return { previous };
		},
		onError: (_error, _variables, context) => {
			queryClient.setQueryData(detailKey, context?.previous);
			toast.error("Erreur lors de l'enregistrement");
		},
		// Prefix match: also refreshes the presenter's cached items for this setlist.
		onSettled: () => queryClient.invalidateQueries({ queryKey: detailKey }),
	});
};

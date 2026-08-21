import { queryKeys } from "@/utils/queryKeys";
import { sortSetlistItems } from "@/utils/setlistOrder";
import {
	type AllSetlistItems,
	allSetlistItemsQuery,
	allSetlistsQuery,
	setlistItemsQuery,
	setlistQuery,
} from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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

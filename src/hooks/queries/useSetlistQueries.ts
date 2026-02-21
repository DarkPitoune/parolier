import { queryKeys } from "@/utils/queryKeys";
import {
	allSetlistItemsQuery,
	allSetlistsQuery,
	setlistLengthQuery,
	setlistQuery,
	taggedSongFromSetlistStepQuery,
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

export const useSetlistStep = (
	setlistId: string | undefined,
	stepNumber: number | undefined,
) =>
	useQuery({
		queryKey: queryKeys.setlists.step(
			setlistId as string,
			stepNumber as number,
		),
		queryFn: async () => {
			const { data, error } = await taggedSongFromSetlistStepQuery(
				setlistId as string,
				stepNumber as number,
			);
			if (error) throw error;
			return data;
		},
		enabled: !!setlistId && stepNumber !== undefined,
		staleTime: 0,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
	});

export const useSetlistLength = (setlistId: string | undefined) =>
	useQuery({
		queryKey: queryKeys.setlists.length(setlistId as string),
		queryFn: async () => {
			const { data, error } = await setlistLengthQuery(setlistId as string);
			if (error) throw error;
			return data?.[0]?.position ?? 0;
		},
		enabled: !!setlistId,
		staleTime: 0,
	});

/**
 * Prefetches ALL setlist items in a single bulk query and seeds each step
 * into the TanStack Query cache. Call once at app startup.
 * After this resolves, every useSetlistStepCached call is instant (cache hit).
 */
export const usePrefetchAllSetlistSteps = () => {
	const queryClient = useQueryClient();

	useEffect(() => {
		const prefetch = async () => {
			try {
				const { data, error } = await allSetlistItemsQuery();
				if (error || !data) return;

				// Group by setlist_id to also seed length cache
				const bySetlist = new Map<string, number>();

				for (const item of data) {
					if (!item.setlist_id) continue;
					const setlistId = String(item.setlist_id);

					// Seed individual step cache (same key as useSetlistStep)
					queryClient.setQueryData(
						queryKeys.setlists.step(setlistId, item.position),
						item,
					);

					// Track max position per setlist for length cache
					const current = bySetlist.get(setlistId) ?? 0;
					if (item.position > current) {
						bySetlist.set(setlistId, item.position);
					}
				}

				// Seed length cache for each setlist
				for (const [setlistId, maxPosition] of bySetlist) {
					queryClient.setQueryData(
						queryKeys.setlists.length(setlistId),
						maxPosition,
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
 * Cache-first variant of useSetlistStep for slideshow mode.
 * Serves from cache immediately (prefetched by usePrefetchAllSetlistSteps),
 * won't refetch on focus/reconnect to avoid jank during presentation.
 */
export const useSetlistStepCached = (
	setlistId: string | undefined,
	stepNumber: number | undefined,
) =>
	useQuery({
		queryKey: queryKeys.setlists.step(
			setlistId as string,
			stepNumber as number,
		),
		queryFn: async () => {
			const { data, error } = await taggedSongFromSetlistStepQuery(
				setlistId as string,
				stepNumber as number,
			);
			if (error) throw error;
			return data;
		},
		enabled: !!setlistId && stepNumber !== undefined,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

import { queryKeys } from "@/utils/queryKeys";
import {
	allSongsQuery,
	allTaggedSongsQuery,
	allTagsQuery,
	taggedSongQuery,
} from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useAllSongs = () =>
	useQuery({
		queryKey: queryKeys.songs.list(),
		queryFn: async () => {
			const { data, error } = await allSongsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000, // 5 min
		gcTime: 24 * 60 * 60 * 1000, // 24h
	});

export const useTaggedSong = (songId: number | undefined) =>
	useQuery({
		queryKey: queryKeys.songs.detail(songId as number),
		queryFn: async () => {
			const { data, error } = await taggedSongQuery(songId as number);
			if (error) throw error;
			return data;
		},
		enabled: songId !== undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useAllTags = () =>
	useQuery({
		queryKey: queryKeys.tags.all(),
		queryFn: async () => {
			const { data, error } = await allTagsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

/**
 * Prefetches all song details in a single batch query and seeds
 * each individual song into the TanStack Query cache.
 * Call once at app startup — runs silently in background.
 */
export const usePrefetchAllSongs = () => {
	const queryClient = useQueryClient();

	useEffect(() => {
		const prefetch = async () => {
			try {
				const { data, error } = await allTaggedSongsQuery();
				if (error || !data) return;

				// Seed each song into the individual detail cache
				for (const song of data) {
					queryClient.setQueryData(queryKeys.songs.detail(song.id), song);
				}

				// Also seed the list cache (stripped to list fields)
				queryClient.setQueryData(
					queryKeys.songs.list(),
					data.map(({ id, title, tags }) => ({ id, title, tags })),
				);
			} catch {
				// Silent failure — offline or bad network, SW cache will serve
			}
		};

		prefetch();
	}, [queryClient]);
};

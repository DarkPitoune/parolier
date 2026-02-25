import { queryKeys } from "@/utils/queryKeys";
import {
	allOrdinaireSongsQuery,
	allOrdinairesQuery,
	allRefrainsQuery,
	allSongsQuery,
	allTaggedSongsQuery,
	allTagsQuery,
	ordinaireDetailQuery,
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

export const useAllTaggedSongs = () =>
	useQuery({
		queryKey: queryKeys.songs.allTagged(),
		queryFn: async () => {
			const { data, error } = await allTaggedSongsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useAllRefrains = () =>
	useQuery({
		queryKey: queryKeys.songs.refrainList(),
		queryFn: async () => {
			const { data, error } = await allRefrainsQuery();
			if (error) throw error;
			return data ?? [];
		},
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

export const useAllOrdinaires = () =>
	useQuery({
		queryKey: queryKeys.ordinaires.list(),
		queryFn: async () => {
			const { data, error } = await allOrdinairesQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useOrdinaireDetail = (id: number | undefined) =>
	useQuery({
		queryKey: queryKeys.ordinaires.detail(id as number),
		queryFn: async () => {
			const { data, error } = await ordinaireDetailQuery(id as number);
			if (error) throw error;
			return data;
		},
		enabled: id !== undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useAllOrdinaireSongs = () =>
	useQuery({
		queryKey: queryKeys.songs.ordinaireList(),
		queryFn: async () => {
			const { data, error } = await allOrdinaireSongsQuery();
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

				// Seed the song list cache (only songs, stripped to list fields)
				queryClient.setQueryData(
					queryKeys.songs.list(),
					data
						.filter((s) => (s.type ?? "song") === "song")
						.map(({ id, title, type, tags }) => ({ id, title, type, tags })),
				);

				// Seed the refrain list cache
				queryClient.setQueryData(
					queryKeys.songs.refrainList(),
					data
						.filter((s) => s.type === "refrain")
						.map(({ id, title, type, tags }) => ({ id, title, type, tags })),
				);

				// Seed the ordinaire song list cache
				queryClient.setQueryData(
					queryKeys.songs.ordinaireList(),
					data
						.filter((s) => s.type === "ordinaire")
						.map(({ id, title, type, tags, ...rest }) => ({
							id,
							title,
							type,
							tags,
							ordinaire_id: "ordinaire_id" in rest ? rest.ordinaire_id : null,
							ordinaire_role:
								"ordinaire_role" in rest ? rest.ordinaire_role : null,
						})),
				);
			} catch {
				// Silent failure — offline or bad network, SW cache will serve
			}
		};

		prefetch();
	}, [queryClient]);
};

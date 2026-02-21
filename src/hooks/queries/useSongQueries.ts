import { queryKeys } from "@/utils/queryKeys";
import { allSongsQuery, allTagsQuery, taggedSongQuery } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";

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

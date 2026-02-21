import { queryKeys } from "@/utils/queryKeys";
import {
	allSetlistsQuery,
	setlistLengthQuery,
	setlistQuery,
	taggedSongFromSetlistStepQuery,
} from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";

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

import { queryKeys } from "@/utils/queryKeys";
import { allTextsQuery } from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const fetchAllTexts = async () => {
	const { data, error } = await allTextsQuery();
	if (error) throw error;
	return (data ?? []).slice().sort((a, b) => a.id - b.id);
};

export const useAllTexts = () =>
	useQuery({
		queryKey: queryKeys.texts.list(),
		queryFn: fetchAllTexts,
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const usePrefetchAllTexts = () => {
	const queryClient = useQueryClient();
	useEffect(() => {
		queryClient.prefetchQuery({
			queryKey: queryKeys.texts.list(),
			queryFn: fetchAllTexts,
			staleTime: 5 * 60 * 1000,
		});
	}, [queryClient]);
};

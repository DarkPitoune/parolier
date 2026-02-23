import { queryKeys } from "@/utils/queryKeys";
import { allTextsQuery, textQuery } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";

export const useAllTexts = () =>
	useQuery({
		queryKey: queryKeys.texts.list(),
		queryFn: async () => {
			const { data, error } = await allTextsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useText = (textId: number | undefined) =>
	useQuery({
		queryKey: queryKeys.texts.detail(textId as number),
		queryFn: async () => {
			const { data, error } = await textQuery(textId as number);
			if (error) throw error;
			return data;
		},
		enabled: textId != null,
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

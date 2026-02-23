import { queryKeys } from "@/utils/queryKeys";
import { getPopularSongsQuery } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";

export const usePopularSongs = (startDate?: string, endDate?: string) =>
	useQuery({
		queryKey: queryKeys.analytics.popular(startDate, endDate),
		queryFn: async () => {
			const { data, error } = await getPopularSongsQuery(startDate, endDate);
			if (error) throw error;
			return data ?? [];
		},
	});

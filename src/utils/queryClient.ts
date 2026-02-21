import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Songs: rare changes (~every 2 months)
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 24 * 60 * 60 * 1000, // 24 hours
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

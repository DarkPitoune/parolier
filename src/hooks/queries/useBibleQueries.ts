import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

interface BibleBook {
	[key: string]: {
		[key: string]: {
			[key: string]: string;
		};
	};
}

export const useBible = () =>
	useQuery<BibleBook>({
		queryKey: queryKeys.bible.all(),
		queryFn: async () => {
			const res = await fetch("https://bible-api-lovat.vercel.app/book/all");
			if (!res.ok) throw new Error("Failed to fetch Bible data");
			return res.json();
		},
		staleTime: Number.POSITIVE_INFINITY,
	});

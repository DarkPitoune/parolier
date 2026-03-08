import { useQuery } from "@tanstack/react-query";

export interface BibleTodayReading {
	book: string;
	bookName: string;
	chapters: Record<string, Record<string, string>>;
}

export interface BibleTodayResponse {
	date: string;
	readings: BibleTodayReading[];
}

export function formatReadingRef(reading: BibleTodayReading): string {
	const chapterKeys = Object.keys(reading.chapters);
	if (chapterKeys.length === 1) {
		return `${reading.bookName} ${chapterKeys[0]}`;
	}
	return `${reading.bookName} ${chapterKeys.join("-")}`;
}

export function useBibleToday() {
	return useQuery({
		queryKey: ["bible-today"],
		queryFn: async () => {
			const res = await fetch(
				"https://bible-api-lovat.vercel.app/bible-in-a-year/today",
			);
			return res.json() as Promise<BibleTodayResponse>;
		},
		staleTime: 1000 * 60 * 60,
	});
}

import { useQuery } from "@tanstack/react-query";

export interface BibleBookEntry {
	abbr: string;
	name: string;
	chapters: { [chapter: string]: { [verse: string]: string } };
}

export interface BibleVerse {
	bookAbbr: string;
	bookName: string;
	chapter: string;
	verse: string;
	text: string;
}

const fetchBible = async (): Promise<BibleBookEntry[]> => {
	const res = await fetch("https://bible-api-lovat.vercel.app/bible.json");
	const data: { books: BibleBookEntry[] } = await res.json();
	return data.books;
};

export const useBible = ({ enabled = true }: { enabled?: boolean } = {}) =>
	useQuery({
		queryKey: ["bible"],
		queryFn: fetchBible,
		staleTime: Number.POSITIVE_INFINITY,
		enabled,
	});

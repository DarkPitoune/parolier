import {
	BookOpenIcon,
	DocumentTextIcon,
	MusicalNoteIcon,
	RectangleGroupIcon,
} from "@heroicons/react/16/solid";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { ComponentType } from "react";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

type ContentType = "song" | "text" | "bible" | "ordinaire";

interface HistoryEntry {
	path: string;
	title: string;
	type: ContentType;
	scrollY: number;
	visitedAt: number;
}

const MAX_HISTORY = 5;

export const navigationHistoryAtom = atomWithStorage<HistoryEntry[]>(
	"navigationHistory",
	[],
	createJSONStorage(() => localStorage),
	{ getOnInit: true },
);

export function useRecordVisit(
	entry: Omit<HistoryEntry, "scrollY" | "visitedAt"> | null,
) {
	const [history, setHistory] = useAtom(navigationHistoryAtom);
	const entryPath = entry?.path;
	const entryTitle = entry?.title;
	const entryType = entry?.type;
	const historyRef = useRef(history);
	historyRef.current = history;

	useEffect(() => {
		if (!entryPath || !entryTitle || !entryType) return;

		setHistory((prev) => {
			const existing = prev.find((h) => h.path === entryPath);
			const filtered = prev.filter((h) => h.path !== entryPath);
			return [
				{
					path: entryPath,
					title: entryTitle,
					type: entryType,
					scrollY: existing?.scrollY ?? 0,
					visitedAt: Date.now(),
				},
				...filtered,
			].slice(0, MAX_HISTORY);
		});

		return () => {
			const scrollY = window.scrollY;
			setHistory((prev) =>
				prev.map((h) => (h.path === entryPath ? { ...h, scrollY } : h)),
			);
		};
	}, [entryPath, entryTitle, entryType, setHistory]);
}

export function useRestoreScroll() {
	const location = useLocation();
	const scrollY = (location.state as { restoreScrollY?: number } | null)
		?.restoreScrollY;

	useEffect(() => {
		if (scrollY == null) return;
		let attempts = 0;
		const maxAttempts = 20;
		const tryScroll = () => {
			window.scrollTo(0, scrollY);
			attempts++;
			if (Math.abs(window.scrollY - scrollY) > 1 && attempts < maxAttempts) {
				requestAnimationFrame(tryScroll);
			}
		};
		const id = requestAnimationFrame(tryScroll);
		return () => cancelAnimationFrame(id);
	}, [scrollY]);
}

export const CONTENT_TYPE_ICONS: Record<
	ContentType,
	ComponentType<{ className?: string }>
> = {
	song: MusicalNoteIcon,
	text: DocumentTextIcon,
	bible: BookOpenIcon,
	ordinaire: RectangleGroupIcon,
};

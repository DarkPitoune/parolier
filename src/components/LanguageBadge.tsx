import type { SongLanguage } from "@/assets/types";

export function LanguageBadge({ language }: { language: SongLanguage }) {
	return (
		<span className="shrink-0 rounded-full border border-jubilateBlue-300 dark:border-slate-500 px-1.5 text-[11px] font-bold leading-4 tracking-wide text-jubilateBlue-500 dark:text-jubilateBlue-300">
			{language.toUpperCase()}
		</span>
	);
}

import { PageHeader } from "@/components";
import {
	type BibleTodayReading,
	useBibleToday,
} from "@/hooks/queries/useBibleTodayQuery";
import { useEffect } from "react";

function ReadingSection({ reading }: { reading: BibleTodayReading }) {
	const chapters = Object.entries(reading.chapters);

	return (
		<section>
			<h2 className="text-xl font-bold text-jubilateBlue-500 dark:text-jubilateBlue-400 mb-4">
				{reading.bookName}
			</h2>
			{chapters.map(([chapterNum, verses]) => (
				<div key={chapterNum} className="mb-6">
					{chapters.length > 1 && (
						<h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
							Chapitre {chapterNum}
						</h3>
					)}
					<div className="text-gray-800 dark:text-gray-200 leading-loose text-lg">
						{Object.entries(verses)
							.sort(([a], [b]) => Number(a) - Number(b))
							.map(([verseNum, text], index, arr) => (
								<span key={verseNum}>
									<span className="text-sm font-medium text-red-700 dark:text-jubilateBlue-400 mr-1">
										{Number(verseNum)}
									</span>
									{text}
									{index < arr.length - 1 && " "}
								</span>
							))}
					</div>
				</div>
			))}
		</section>
	);
}

function BibleToday() {
	const { data, isLoading } = useBibleToday();

	useEffect(() => {
		document.title = "Lecture du jour - Bible - Parolier";
	}, []);

	return (
		<div className="bg-white dark:bg-gray-800 min-h-screen">
			<PageHeader variant="detail" title="Lecture du jour" />

			<div className="p-6">
				{isLoading ? (
					<div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-500 dark:text-gray-400">
						<svg
							className="animate-spin h-8 w-8"
							viewBox="0 0 24 24"
							fill="none"
						>
							<title>Chargement…</title>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							/>
						</svg>
					</div>
				) : data ? (
					<div className="max-w-4xl mx-auto space-y-8">
						{data.readings.map((reading) => (
							<ReadingSection key={reading.book} reading={reading} />
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}

export { BibleToday };

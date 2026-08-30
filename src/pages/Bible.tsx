import { PageHeader, useLeader } from "@/components";
import {
	UnifiedSearchInput,
	UnifiedSearchResults,
} from "@/components/UnifiedSearch/UnifiedSearch";
import { useUnifiedSearch } from "@/components/UnifiedSearch/useUnifiedSearch";
import { type BibleVerse, useBible } from "@/hooks/queries/useBibleQueries";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

function Bible() {
	const { data: bible = [], isLoading } = useBible();
	const [verses, setVerses] = useState<BibleVerse[]>([]);
	const unifiedSearch = useUnifiedSearch("bible");
	const { leader } = useLeader();
	const { book: selectedBook, chapter: selectedChapter } = useParams();
	const navigate = useNavigate();
	const { hash } = useLocation();

	// :target is no help here — the verses mount well after the document does,
	// and in-app navigation is pushState, which never retargets.
	const targetVerse = hash.startsWith("#verse-")
		? hash.slice("#verse-".length)
		: null;

	const selectedBookEntry = useMemo(
		() => bible.find((b) => b.abbr === selectedBook),
		[bible, selectedBook],
	);
	const bookName = selectedBookEntry?.name;

	const chapters = useMemo(
		() => (selectedBookEntry ? Object.keys(selectedBookEntry.chapters) : []),
		[selectedBookEntry],
	);

	useEffect(() => {
		if (selectedBook && selectedChapter && selectedBookEntry) {
			const chapterData = selectedBookEntry.chapters[selectedChapter];
			if (chapterData) {
				const verseList: BibleVerse[] = Object.entries(chapterData)
					.map(([verseNum, text]) => ({
						bookAbbr: selectedBook,
						bookName: selectedBookEntry.name,
						chapter: selectedChapter,
						verse: verseNum,
						text,
					}))
					.sort((a, b) => Number(a.verse) - Number(b.verse));
				setVerses(verseList);
				document.title = `${selectedBookEntry.name} ${selectedChapter} - Bible - Parolier`;
			} else {
				setVerses([]);
			}
		} else {
			setVerses([]);
			if (selectedBookEntry) {
				document.title = `${selectedBookEntry.name} - Bible - Parolier`;
			} else {
				document.title = "Bible - Parolier";
			}
		}
	}, [selectedBook, selectedChapter, selectedBookEntry]);

	useEffect(() => {
		if (!targetVerse || verses.length === 0) return;
		document
			.getElementById(`verse-${targetVerse}`)
			?.scrollIntoView({ block: "center", behavior: "smooth" });
	}, [targetVerse, verses]);

	const selectBook = (abbr: string) => {
		navigate(`/bible/${encodeURIComponent(abbr)}`);
	};

	const selectChapter = (chapter: string) => {
		if (selectedBook) {
			navigate(
				`/bible/${encodeURIComponent(selectedBook)}/${encodeURIComponent(chapter)}`,
			);
		}
	};

	const goBack = () => {
		if (selectedChapter && selectedBook) {
			navigate(`/bible/${encodeURIComponent(selectedBook)}`);
		} else if (selectedBook) {
			navigate("/bible");
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800 min-h-screen">
			<div
				className={clsx(
					"transition-all sticky bg-white dark:bg-gray-800 print:hidden",
					leader ? "top-6" : "top-0",
				)}
			>
				<PageHeader
					variant="list"
					left={
						<UnifiedSearchInput
							search={unifiedSearch}
							placeholder="Rechercher un livre ou un texte..."
						/>
					}
				/>
			</div>

			{unifiedSearch.showResults ? (
				<UnifiedSearchResults search={unifiedSearch} />
			) : (
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
							<p className="text-lg">Connexion avec la Parole de Dieu...</p>
						</div>
					) : (
						<>
							<div className="flex justify-between items-center mb-4">
								<div className="flex items-center gap-4">
									{(selectedBook || selectedChapter) && (
										<button
											onClick={goBack}
											className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
											type="button"
										>
											← Retour
										</button>
									)}
									<h1 className="text-2xl font-bold text-black dark:text-white">
										{selectedChapter && bookName
											? `${bookName} - Chapitre ${selectedChapter}`
											: bookName
												? `${bookName} - Chapitres`
												: "Bible"}
									</h1>
								</div>
							</div>

							{/* Book selection */}
							{!selectedBook && (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{bible.map((book) => (
										<button
											key={book.abbr}
											onClick={() => selectBook(book.abbr)}
											className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-left"
											type="button"
										>
											<span className="text-lg font-medium text-black dark:text-white">
												{book.name}
											</span>
										</button>
									))}
								</div>
							)}

							{/* Chapter selection */}
							{selectedBook && !selectedChapter && (
								<div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
									{chapters.map((chapter) => (
										<button
											key={chapter}
											onClick={() => selectChapter(chapter)}
											className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-center"
											type="button"
										>
											<span className="text-lg font-medium text-gray-800 dark:text-gray-200">
												{chapter}
											</span>
										</button>
									))}
								</div>
							)}

							{/* Verse display */}
							{selectedBook && selectedChapter && verses.length > 0 && (
								<>
									<div className="text-gray-800 dark:text-gray-200 leading-loose text-lg max-w-4xl mx-auto px-4">
										{verses.map((verse, index) => (
											<span
												key={`${verse.verse}`}
												id={`verse-${verse.verse}`}
												className={clsx(
													"transition-colors duration-200 rounded-sm px-1 py-0.5 -mx-1 -my-0.5 scroll-mt-24",
													verse.verse === targetVerse
														? "bg-jubilateBlue-200 dark:bg-jubilateBlue-400/30"
														: "hover:bg-gray-100/50 dark:hover:bg-gray-700/50",
												)}
											>
												<span className="text-sm font-medium text-red-700 dark:text-jubilateBlue-400 mr-1">
													{Number(verse.verse)}
												</span>
												{verse.text}
												{index < verses.length - 1 && " "}
											</span>
										))}
									</div>

									{/* Chapter navigation */}
									<div className="flex justify-between items-center mt-8 max-w-4xl mx-auto px-4">
										<div>
											{(() => {
												const idx = chapters.indexOf(selectedChapter ?? "");
												if (idx > 0) {
													const prev = chapters[idx - 1];
													return (
														<button
															onClick={() => selectChapter(prev)}
															className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
															type="button"
														>
															← Chapitre {prev}
														</button>
													);
												}
												return null;
											})()}
										</div>
										<div>
											{(() => {
												const idx = chapters.indexOf(selectedChapter ?? "");
												if (idx >= 0 && idx < chapters.length - 1) {
													const next = chapters[idx + 1];
													return (
														<button
															onClick={() => selectChapter(next)}
															className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition"
															type="button"
														>
															Chapitre {next} →
														</button>
													);
												}
												return null;
											})()}
										</div>
									</div>
								</>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

export { Bible };

import { PageHeader, useLeader } from "@/components";
import { globalSearchEnabledAtom } from "@/components/Contexts/SettingsContext";
import {
	UnifiedSearchInput,
	UnifiedSearchResults,
} from "@/components/UnifiedSearch/UnifiedSearch";
import { useUnifiedSearch } from "@/components/UnifiedSearch/useUnifiedSearch";
import {
	type BibleBookEntry,
	type BibleVerse,
	useBible,
} from "@/hooks/queries/useBibleQueries";
import { useRecordVisit, useRestoreScroll } from "@/hooks/useNavigationHistory";
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

function Bible() {
	const { data: bible = [], isLoading } = useBible();
	const [verses, setVerses] = useState<BibleVerse[]>([]);
	const [searchValue, setSearchValue] = useState("");
	const [filteredBooks, setFilteredBooks] = useState<BibleBookEntry[] | null>(
		null,
	);
	const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
	const globalSearchEnabled = useAtomValue(globalSearchEnabledAtom);
	const unifiedSearch = useUnifiedSearch("bible");
	const { leader } = useLeader();
	const { book: selectedBook, chapter: selectedChapter } = useParams();
	const navigate = useNavigate();

	const selectedBookEntry = useMemo(
		() => bible.find((b) => b.abbr === selectedBook),
		[bible, selectedBook],
	);
	const bookName = selectedBookEntry?.name;

	useRecordVisit(
		selectedBook && selectedChapter && bookName
			? {
					path: `/bible/${selectedBook}/${selectedChapter}`,
					title: `${bookName} ${selectedChapter}`,
					type: "bible",
				}
			: null,
	);
	useRestoreScroll();

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

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setSearchValue(event.target.value);
			const query = event.target.value.toLowerCase();

			// Navigate back to main Bible page when typing
			if (selectedBook || selectedChapter) {
				navigate("/bible");
			}

			if (query.length === 0) {
				setFilteredBooks(null);
				setSearchResults([]);
			} else if (query.length < 3) {
				// For short queries, only search book names
				setFilteredBooks(
					bible.filter((b) => b.name.toLowerCase().includes(query)),
				);
				setSearchResults([]);
			} else {
				// For longer queries, search through all verses
				const results: BibleVerse[] = [];
				for (const book of bible) {
					for (const [chapter, verses] of Object.entries(book.chapters)) {
						for (const [verseNum, text] of Object.entries(verses)) {
							if (text.toLowerCase().includes(query)) {
								results.push({
									bookAbbr: book.abbr,
									bookName: book.name,
									chapter,
									verse: verseNum,
									text,
								});
							}
						}
					}
				}
				setSearchResults(results.slice(0, 50)); // Limit to 50 results
				setFilteredBooks(
					bible.filter((b) => b.name.toLowerCase().includes(query)),
				);
			}
		},
		[bible, selectedBook, selectedChapter, navigate],
	);

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
						globalSearchEnabled ? (
							<UnifiedSearchInput
								search={unifiedSearch}
								placeholder="Rechercher un livre ou un texte..."
							/>
						) : (
							<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
								<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
								<input
									className="w-full h-9 rounded-full px-2 outline-hidden bg-white dark:bg-white text-black dark:text-black"
									type="search"
									onChange={search}
									value={searchValue}
									placeholder="Rechercher un livre ou un texte..."
								/>
							</div>
						)
					}
				/>
			</div>

			{globalSearchEnabled && unifiedSearch.showResults ? (
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
									{(filteredBooks ?? bible).map((book) => (
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
												className="hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors duration-200 rounded-sm px-1 py-0.5 -mx-1 -my-0.5 scroll-mt-24"
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

							{/* Search results */}
							{searchResults.length > 0 && (
								<div className="space-y-4">
									<h2 className="text-xl font-bold text-black dark:text-white">
										Résultats de recherche ({searchResults.length})
									</h2>
									{searchResults.map((verse) => (
										<a
											key={`${verse.bookAbbr}-${verse.chapter}-${verse.verse}`}
											href={`/bible/${encodeURIComponent(verse.bookAbbr)}/${encodeURIComponent(verse.chapter)}#verse-${verse.verse}`}
											className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
										>
											<div className="flex justify-between items-start mb-2">
												<span className="text-sm font-medium text-jubilateBlue-600 dark:text-jubilateBlue-400">
													{verse.bookName} {verse.chapter}:{verse.verse}
												</span>
											</div>
											<p className="text-gray-800 dark:text-gray-200">
												{verse.text}
											</p>
										</a>
									))}
								</div>
							)}

							{(filteredBooks ?? bible).length === 0 &&
								searchValue &&
								searchResults.length === 0 && (
									<div className="px-2 py-8 text-center text-gray-500 dark:text-gray-400">
										Aucun résultat trouvé pour "{searchValue}"
									</div>
								)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

export { Bible };

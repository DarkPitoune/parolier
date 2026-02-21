import { PageHeader, SettingsSidePanel, useLeader } from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel";
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

interface BibleBook {
	[key: string]: {
		[key: string]: {
			[key: string]: string;
		};
	};
}

interface BibleVerse {
	book: string;
	chapter: string;
	verse: string;
	text: string;
}

function Bible() {
	const [bible, setBible] = useState<BibleBook>({});
	const [verses, setVerses] = useState<BibleVerse[]>([]);
	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [filteredBooks, setFilteredBooks] = useState<string[]>([]);
	const [searchResults, setSearchResults] = useState<BibleVerse[]>([]);
	const { leader } = useLeader();
	const { book: selectedBook, chapter: selectedChapter } = useParams();
	const navigate = useNavigate();

	const books = useMemo(() => Object.keys(bible), [bible]);
	const chapters = useMemo(
		() => (selectedBook ? Object.keys(bible[selectedBook] || {}) : []),
		[bible, selectedBook],
	);

	useEffect(() => {
		fetch("https://bible-api-lovat.vercel.app/book/all")
			.then((res) => res.json())
			.then((data) => {
				setBible(data);
				setFilteredBooks(Object.keys(data));
			})
			.catch(console.error);
	}, []);

	useEffect(() => {
		if (
			selectedBook &&
			selectedChapter &&
			bible[selectedBook]?.[selectedChapter]
		) {
			const chapterVerses = bible[selectedBook][selectedChapter];
			const verseList: BibleVerse[] = Object.entries(chapterVerses)
				.map(([verseNum, text]) => ({
					book: selectedBook,
					chapter: selectedChapter,
					verse: verseNum,
					text,
				}))
				.sort((a, b) => Number(a.verse) - Number(b.verse));
			setVerses(verseList);
			document.title = `${selectedBook} ${selectedChapter} - Bible - Parolier`;
		} else {
			setVerses([]);
			if (selectedBook) {
				document.title = `${selectedBook} - Bible - Parolier`;
			} else {
				document.title = "Bible - Parolier";
			}
		}
	}, [selectedBook, selectedChapter, bible]);

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setSearchValue(event.target.value);
			const query = event.target.value.toLowerCase();

			// Navigate back to main Bible page when typing
			if (selectedBook || selectedChapter) {
				navigate("/bible");
			}

			if (query.length === 0) {
				setFilteredBooks(books);
				setSearchResults([]);
			} else if (query.length < 3) {
				// For short queries, only search book names
				setFilteredBooks(
					books.filter((book) => book.toLowerCase().includes(query)),
				);
				setSearchResults([]);
			} else {
				// For longer queries, search through all verses
				const results: BibleVerse[] = [];
				for (const book of books) {
					for (const chapter of Object.keys(bible[book] || {})) {
						for (const [verseNum, text] of Object.entries(
							bible[book][chapter] || {},
						)) {
							if (text.toLowerCase().includes(query)) {
								results.push({
									book,
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
					books.filter((book) => book.toLowerCase().includes(query)),
				);
			}
		},
		[books, bible, selectedBook, selectedChapter, navigate],
	);

	const selectBook = (book: string) => {
		navigate(`/bible/${encodeURIComponent(book)}`);
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
			<SettingsSidePanel />
			<NavigationSidePanel
				open={isNavigationPanelOpen}
				setOpen={setIsNavigationPanelOpen}
			/>
			<div
				className={clsx(
					"transition-all sticky bg-white dark:bg-gray-800 print:hidden",
					leader ? "top-6" : "top-0",
				)}
			>
				<PageHeader
					variant="list"
					left={
						<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
							<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
							<input
								className="w-full h-9 rounded-full px-2 outline-none bg-white dark:bg-white text-black dark:text-black"
								type="search"
								onChange={search}
								value={searchValue}
								placeholder="Rechercher un livre ou un texte..."
							/>
						</div>
					}
					right={
						<button type="button" onClick={() => setIsNavigationPanelOpen(true)}>
							<img className="h-12" src="/svg/logo.svg" alt="Logo" />
						</button>
					}
				/>
			</div>

			<div className="p-6">
				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center gap-4">
						{(selectedBook || selectedChapter) && (
							<button
								onClick={goBack}
								className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
								type="button"
							>
								← Retour
							</button>
						)}
						<h1 className="text-2xl font-bold text-black dark:text-white">
							{selectedChapter
								? `${selectedBook} - Chapitre ${selectedChapter}`
								: selectedBook
									? `${selectedBook} - Chapitres`
									: "Bible"}
						</h1>
					</div>
				</div>

				{/* Book selection */}
				{!selectedBook && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{filteredBooks.map((book) => (
							<button
								key={book}
								onClick={() => selectBook(book)}
								className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-left"
								type="button"
							>
								<span className="text-lg font-medium text-black dark:text-white">
									{book}
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
									className="hover:bg-gray-100 dark:hover:bg-gray-700 hover:bg-opacity-50 transition-colors duration-200 rounded px-1 py-0.5 -mx-1 -my-0.5 scroll-mt-24"
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
								{Number(selectedChapter) > 1 && (
									<button
										onClick={() =>
											selectChapter(String(Number(selectedChapter) - 1))
										}
										className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
										type="button"
									>
										← Chapitre {Number(selectedChapter) - 1}
									</button>
								)}
							</div>
							<div>
								{Number(selectedChapter) < chapters.length && (
									<button
										onClick={() =>
											selectChapter(String(Number(selectedChapter) + 1))
										}
										className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
										type="button"
									>
										Chapitre {Number(selectedChapter) + 1} →
									</button>
								)}
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
								key={`${verse.book}-${verse.chapter}-${verse.verse}`}
								href={`/bible/${encodeURIComponent(verse.book)}/${encodeURIComponent(verse.chapter)}#verse-${verse.verse}`}
								className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
							>
								<div className="flex justify-between items-start mb-2">
									<span className="text-sm font-medium text-jubilateBlue-600 dark:text-jubilateBlue-400">
										{verse.book} {verse.chapter}:{verse.verse}
									</span>
								</div>
								<p className="text-gray-800 dark:text-gray-200">{verse.text}</p>
							</a>
						))}
					</div>
				)}

				{filteredBooks.length === 0 &&
					searchValue &&
					searchResults.length === 0 && (
						<div className="px-2 py-8 text-center text-gray-500 dark:text-gray-400">
							Aucun résultat trouvé pour "{searchValue}"
						</div>
					)}
			</div>
		</div>
	);
}

export { Bible };

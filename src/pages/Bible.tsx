import { SettingsSidePanel, useLeader } from "@/components";
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
	const [selectedBook, setSelectedBook] = useState<string | null>(null);
	const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
	const [verses, setVerses] = useState<BibleVerse[]>([]);
	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [filteredBooks, setFilteredBooks] = useState<string[]>([]);
	const { leader } = useLeader();

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
		} else {
			setVerses([]);
		}
	}, [selectedBook, selectedChapter, bible]);

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setSearchValue(event.target.value);
			if (event.target.value.length === 0) {
				setFilteredBooks(books);
			} else {
				setFilteredBooks(
					books.filter((book) =>
						book.toLowerCase().includes(event.target.value.toLowerCase()),
					),
				);
			}
		},
		[books],
	);

	const selectBook = (book: string) => {
		setSelectedBook(book);
		setSelectedChapter(null);
		setVerses([]);
	};

	const selectChapter = (chapter: string) => {
		setSelectedChapter(chapter);
	};

	const goBack = () => {
		if (selectedChapter) {
			setSelectedChapter(null);
			setVerses([]);
		} else if (selectedBook) {
			setSelectedBook(null);
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
				<div className="bg-jubilateBlue-500 dark:bg-slate-900 px-6 py-4 gap-4 flex justify-between items-center">
					<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
						<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						<input
							className="w-full h-9 rounded-full px-2 outline-none bg-white dark:bg-white text-black dark:text-black"
							type="search"
							onChange={search}
							value={searchValue}
							placeholder="Rechercher un livre..."
						/>
					</div>
					<button type="button" onClick={() => setIsNavigationPanelOpen(true)}>
						<img className="h-12" src="/svg/logo.svg" alt="Logo" />
					</button>
				</div>
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
					<div className="space-y-4">
						{verses.map((verse) => (
							<div
								key={`${verse.verse}`}
								className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
							>
								<span className="text-sm font-bold text-jubilateBlue-600 dark:text-jubilateBlue-400 min-w-[2rem]">
									{Number(verse.verse)}
								</span>
								<p className="text-gray-800 dark:text-gray-200 leading-relaxed">
									{verse.text}
								</p>
							</div>
						))}
					</div>
				)}

				{filteredBooks.length === 0 && searchValue && (
					<div className="px-2 py-8 text-center text-gray-500 dark:text-gray-400">
						Aucun livre trouvé pour "{searchValue}"
					</div>
				)}
			</div>
		</div>
	);
}

export { Bible };

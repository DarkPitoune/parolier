import { useIsMobile } from "@/hooks/useIsMobile";
import {
	type AllTexts,
	type Text,
	allTextsQuery,
	textQuery,
} from "@/utils/supabase";
import clsx from "clsx";
import Fuse from "fuse.js";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { TextItem, getTextItemId } from "./TextItem";

type TextPickerProps = {
	handleClose: (textId?: number) => void;
};

const TextPicker = ({ handleClose }: TextPickerProps) => {
	const isMobile = useIsMobile();
	const [texts, setTexts] = useState<AllTexts>([]);
	const [filteredTexts, setFilteredTexts] = useState<AllTexts>([]);
	const [selectedTextId, setSelectedTextId] = useState<number | null>(null);
	const [selectedText, setSelectedText] = useState<Text | null>(null);

	useEffect(() => {
		allTextsQuery().then(({ data }) => {
			if (data) {
				setTexts(data);
				setFilteredTexts(data);
			}
		});
	}, []);

	useEffect(() => {
		if (selectedTextId !== null) {
			textQuery(selectedTextId).then(({ data }) => {
				if (data) setSelectedText(data);
			});
		}
	}, [selectedTextId]);

	const scrollToSelectedText = useCallback(() => {
		if (selectedTextId !== null) {
			const element = document.getElementById(getTextItemId(selectedTextId));
			if (element)
				element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [selectedTextId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to trigger the function when selectedTextId changes
	useEffect(scrollToSelectedText, [scrollToSelectedText]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") handleClose();
			if (event.key === "Enter" && selectedTextId !== null)
				handleClose(selectedTextId);
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setSelectedTextId((prev) => {
					if (prev === null) return 0;
					const index = filteredTexts.findIndex((t) => t.id === prev);
					if (index > 0) return filteredTexts[index - 1].id;
					return prev;
				});
			}
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setSelectedTextId((prev) => {
					if (prev === null) return filteredTexts[0].id;
					const index = filteredTexts.findIndex((t) => t.id === prev);
					if (index < filteredTexts.length - 1)
						return filteredTexts[index + 1].id;
					return prev;
				});
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [filteredTexts, selectedTextId, handleClose]);

	const fuse = useMemo(
		() => new Fuse(texts, { keys: ["title", "content"] }),
		[texts],
	);
	const [searchValue, setSearchValue] = useState("");

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setSearchValue(event.target.value);
			if (event.target.value.length === 0) setFilteredTexts(texts);
			else {
				window.scrollTo(0, 0);
				if (!Number.isNaN(Number(event.target.value))) {
					const text = texts.find((t) => t.id === Number(event.target.value));
					setFilteredTexts(text ? [text] : []);
					setSelectedTextId(text ? text.id : null);
				} else {
					const searchResults = fuse
						.search(event.target.value)
						.map((hit) => hit.item);
					setFilteredTexts(searchResults);
					setSelectedTextId(
						searchResults.length > 0 ? searchResults[0].id : null,
					);
				}
			}
		},
		[fuse, texts],
	);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			className="bg-black/50 fixed inset-0 flex justify-center items-center"
			onClick={() => handleClose()}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: fine here since we're just doing a bubble stopper */}
			<div
				className="bg-white dark:bg-gray-800 rounded-lg size-11/12 md:size-4/5 overflow-y-auto grid grid-cols-3"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex flex-col col-span-3 md:col-span-1 min-h-0">
					<h2 className="text-xl font-bold px-4 py-2 shadow-sm dark:text-white text-black">
						Sélectionner un texte
					</h2>
					<div>
						<input
							placeholder="Tapez un texte ici"
							className="px-2 py-1 w-full bg-transparent text-black dark:text-white outline-hidden"
							type="text"
							value={searchValue}
							onChange={search}
							autoFocus
						/>
					</div>
					<div className="grow min-h-0 overflow-y-auto scrollbar">
						{filteredTexts.map((text) => (
							<button
								key={text.id}
								className={clsx(
									"w-full text-left",
									selectedTextId === text.id && "bg-gray-100 dark:bg-gray-900",
								)}
								type="button"
								onClick={() => {
									if (isMobile) {
										handleClose(text.id);
									} else {
										setSelectedTextId(text.id);
									}
								}}
							>
								<TextItem text={text} />
							</button>
						))}
					</div>
					{selectedTextId !== null && !isMobile && (
						<div className="p-2 flex shadow-sm">
							<button
								className="bg-jubilateBlue-500 text-white hover:bg-jubilateBlue-300 py-1 px-4 rounded-sm grow transition-colors"
								type="submit"
								onClick={() => handleClose(selectedTextId)}
							>
								Sélectionner
							</button>
						</div>
					)}
				</div>
				<div className="col-span-2 min-h-0 overflow-y-auto hidden md:block">
					{selectedText && (
						<div className="p-6">
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
								<h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
									{selectedText.title}
								</h2>
								<div className="whitespace-pre-wrap text-black dark:text-white leading-relaxed">
									{selectedText.content}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export { TextPicker };

import { SettingsSidePanel, useLeader } from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel";
import { TextItem, getTextItemId } from "@/components/TextItem";
import {
	type AllTexts,
	allTextsQuery,
	newTextMutation,
} from "@/utils/supabase";
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import Fuse from "fuse.js";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

function Texts() {
	const [texts, setTexts] = useState<AllTexts>([]);
	const [filteredTexts, setFilteredTexts] = useState<AllTexts>([]);
	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);
	const navigate = useNavigate();
	const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(
		null,
	);
	const fuse = useMemo(
		() => new Fuse(texts, { keys: ["title", "content"] }),
		[texts],
	);
	const { leader } = useLeader();

	useEffect(() => {
		allTextsQuery().then(({ data }) => {
			if (data && data.length > 0) {
				data.sort((a, b) => a.id - b.id);
				setTexts(data);
				setFilteredTexts(data);
				fuse.setCollection(data);
			}
		});
	}, [fuse.setCollection]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to scroll AFTER the texts are loaded in the DOM
	useEffect(() => {
		window.scroll({
			top: Number(sessionStorage.getItem("textsScroll") || "0"),
		});
	}, [texts]);

	const scrollToSelectedText = useCallback(() => {
		if (selectedTextIndex !== null) {
			const selectedTextId = filteredTexts[selectedTextIndex].id;
			const element = document.getElementById(getTextItemId(selectedTextId));
			if (element)
				element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [selectedTextIndex, filteredTexts]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to trigger the function when selectedTextId changes
	useEffect(scrollToSelectedText, [scrollToSelectedText]);

	useEffect(() => {
		const setScrollY = () =>
			sessionStorage.setItem("textsScroll", window.scrollY.toString());
		window.addEventListener("scroll", setScrollY);

		const handleKeyDown = (event: KeyboardEvent) => {
			if (selectedTextIndex !== null && event.key === "ArrowUp") {
				event.preventDefault();
				setSelectedTextIndex(Math.max(0, selectedTextIndex - 1));
			}
			if (event.key === "ArrowDown") {
				event.preventDefault();
				if (selectedTextIndex === null) setSelectedTextIndex(0);
				else
					setSelectedTextIndex(
						Math.min(filteredTexts.length - 1, selectedTextIndex + 1),
					);
			}
			if (event.key === "Enter") {
				if (selectedTextIndex !== null) {
					navigate(`/texts/${filteredTexts[selectedTextIndex].id}`);
				}
			}
			// Catch any letter input (a-z, A-Z) and focus the search input
			if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
				const searchInput = document.querySelector(
					'input[type="search"]',
				) as HTMLInputElement | null;
				if (searchInput) {
					searchInput.focus();
					if (document.activeElement !== searchInput) {
						searchInput.value += event.key;
						const inputEvent = new Event("input", { bubbles: true });
						searchInput.dispatchEvent(inputEvent);
					}
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("scroll", setScrollY);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [selectedTextIndex, filteredTexts, navigate]);

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
					setSelectedTextIndex(0);
				} else {
					setFilteredTexts(
						fuse.search(event.target.value).map((hit) => hit.item),
					);
					setSelectedTextIndex(null);
				}
			}
		},
		[fuse, texts],
	);

	const createNewText = async () => {
		const title = prompt("Titre du texte");
		if (!title) return;
		const content = prompt("Contenu du texte") || "";
		const { error, data } = await newTextMutation(title, content);
		if (error) {
			toast.error(`Erreur lors de la création du texte: ${error.message}`);
		} else {
			toast.success("Texte créé avec succès");
			navigate(`/texts/${data.id}`);
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800">
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
							placeholder="Rechercher un texte..."
						/>
					</div>
					<button type="button" onClick={() => setIsNavigationPanelOpen(true)}>
						<img className="h-12" src="/svg/logo.svg" alt="Logo" />
					</button>
				</div>
			</div>
			<div className="p-6">
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-2xl font-bold text-black dark:text-white">
						Textes ({filteredTexts.length})
					</h1>
					<button
						className="px-4 py-2 bg-jubilateBlue-500 text-white rounded hover:bg-jubilateBlue-600 transition"
						onClick={createNewText}
						type="button"
					>
						Nouveau texte
					</button>
				</div>
			</div>
			<div className="flex flex-col items-stretch px-2 divide-y divide-jubilateBlue-300 dark:bg-gray-800 print:block print:p-0">
				{filteredTexts.map((text, index) => (
					<Link
						key={text.id}
						to={`/texts/${text.id}`}
						className={
							index === selectedTextIndex ? "bg-gray-300 dark:bg-slate-700" : ""
						}
					>
						<TextItem text={text} />
					</Link>
				))}

				{filteredTexts.length === 0 && searchValue && (
					<div className="px-2 py-8 text-center text-gray-500 dark:text-gray-400">
						Aucun texte trouvé pour "{searchValue}"
					</div>
				)}
			</div>
		</div>
	);
}

export { Texts };

import { PageHeader, useLeader } from "@/components";
import { TextItem } from "@/components/TextItem";
import {
	UnifiedSearchInput,
	UnifiedSearchResults,
} from "@/components/UnifiedSearch/UnifiedSearch";
import { useUnifiedSearch } from "@/components/UnifiedSearch/useUnifiedSearch";
import { useAllTexts } from "@/hooks/queries/useTextQueries";
import { type AllTexts, newTextMutation } from "@/utils/supabase";
import clsx from "clsx";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

function Texts() {
	const { data: textsData } = useAllTexts();
	const texts = useMemo<AllTexts>(() => textsData ?? [], [textsData]);
	const unifiedSearch = useUnifiedSearch("texts");
	const navigate = useNavigate();
	const { leader } = useLeader();

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
							placeholder="Rechercher un texte..."
						/>
					}
				/>
			</div>
			{unifiedSearch.showResults ? (
				<UnifiedSearchResults search={unifiedSearch} />
			) : (
				<>
					<div className="p-6">
						<div className="flex justify-between items-center mb-4">
							<h1 className="text-2xl font-bold text-black dark:text-white">
								Textes
							</h1>
							<button
								className="px-4 py-2 bg-jubilateBlue-500 text-white rounded-sm hover:bg-jubilateBlue-600 transition"
								onClick={createNewText}
								type="button"
							>
								Nouveau texte
							</button>
						</div>
					</div>
					<div className="flex flex-col items-stretch px-2 divide-y divide-jubilateBlue-300 dark:bg-gray-800 print:block print:p-0">
						{texts.map((text) => (
							<Link key={text.id} to={`/texts/${text.id}`}>
								<TextItem text={text} />
							</Link>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export { Texts };

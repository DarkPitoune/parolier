import { BackButton, useLeader } from "@/components";
import { type Text, textQuery } from "@/utils/supabase";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

type RightClickMenuPosition = {
	x: number;
	y: number;
};

function TextPage() {
	const { textId } = useParams();
	const [text, setText] = useState<Text>();
	const rightClickMenuRef = useRef<HTMLDivElement>(null);
	const [rightClickMenuPosition, setRightClickMenuPosition] =
		useState<RightClickMenuPosition | null>(null);

	const handleOnContextMenu: React.MouseEventHandler<HTMLDivElement> = (e) => {
		e.preventDefault();
		e.stopPropagation();

		setRightClickMenuPosition({
			x: e.clientX,
			y: e.clientY + window.pageYOffset,
		});
	};

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				rightClickMenuRef.current &&
				!rightClickMenuRef.current.contains(e.target as Node)
			)
				setRightClickMenuPosition(null);
		};

		document.addEventListener("click", handleClick);
		return () => {
			document.removeEventListener("click", handleClick);
		};
	}, []);

	useEffect(() => {
		if (textId) {
			textQuery(Number(textId)).then(({ data }) => {
				if (data) setText(data);
			});
		}
	}, [textId]);

	if (!text) return null;

	return (
		<div>
			<div className="flex justify-between items-center py-2 md:py-4 px-2 md:px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky bg-white dark:bg-gray-900 top-0">
				<BackButton />

				<div className="flex gap-4 items-center font-flame text-xl lg:text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
					<h1>{text.id}.</h1>
					<h1>{text.title}</h1>
				</div>
				<span />
			</div>
			<div onContextMenu={handleOnContextMenu} className="p-6">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
							{text.title}
						</h2>
						<div className="whitespace-pre-wrap text-black dark:text-white leading-relaxed">
							{text.content}
						</div>
						<div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
							Créé le{" "}
							{new Date(text.created_at).toLocaleDateString("fr-FR", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</div>
					</div>
				</div>
				{rightClickMenuPosition && (
					<div
						ref={rightClickMenuRef}
						style={{
							left: rightClickMenuPosition.x,
							top: rightClickMenuPosition.y,
						}}
						className="absolute rounded-md bg-gray-100 dark:bg-slate-800 p-1 flex flex-col gap-1"
					>
						<p className="text-sm italic px-1">Actions administrateur</p>
						<Link
							to={`/texts/${text.id}/edit`}
							className="px-2 py-1 text-black dark:text-white dark:hover:bg-slate-700 bg-white hover:bg-slate-200 dark:bg-slate-800 rounded-md transition"
						>
							Modifier le texte
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}

export { TextPage };

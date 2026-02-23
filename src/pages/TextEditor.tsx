import { PageHeader, TextInput } from "@/components";
import { useText } from "@/hooks/queries/useTextQueries";
import supabase, { type Text } from "@/utils/supabase";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const TextEditor = () => {
	const { textId } = useParams();
	const navigate = useNavigate();
	const { data: textData, isLoading } = useText(
		textId ? Number(textId) : undefined,
	);
	const [text, setText] = useState<Text | null>(null);

	// Initialize local mutable copy from query data
	useEffect(() => {
		if (textData) {
			setText(textData);
		}
	}, [textData]);

	useEffect(() => {
		if (text?.title) {
			document.title = `Modifier "${text.title}" - Parolier`;
		}
	}, [text?.title]);

	const handleSave = async () => {
		if (!text) return;
		const { title, content } = text;

		const { error } = await supabase
			.from("texts")
			.update({ title, content })
			.eq("id", text.id);

		if (error) throw error;
		toast.success("Modifications enregistrées");
		navigate(`/texts/${text.id}`);
	};

	const handleChange = (field: keyof Text, value: string) => {
		setText((prev) => (prev ? { ...prev, [field]: value } : null));
	};

	if (isLoading) return <div className="text-center">Chargement...</div>;

	return (
		<div className="bg-white dark:bg-gray-800 min-h-screen">
			<PageHeader
				variant="detail"
				title={`Modifier "${text?.title}"`}
				right={
					<button
						type="button"
						onClick={handleSave}
						className="bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white font-bold px-2 py-1 rounded-md shadow-sm hover:bg-jubilateBlue-700 dark:hover:bg-jubilateBlue-500"
					>
						Enregistrer
					</button>
				}
			/>
			{text && (
				<main className="p-4 text-black dark:text-white space-y-4">
					<div className="border p-4 rounded-md border-jubilateBlue-100 dark:border-slate-500">
						<TextInput
							label="Titre"
							value={text.title}
							onChange={(value) => handleChange("title", value)}
						/>
					</div>

					<div className="border p-4 rounded-md border-jubilateBlue-100 dark:border-slate-500">
						<label className="block text-sm font-medium mb-2">Contenu</label>
						<textarea
							value={text.content}
							onChange={(e) => handleChange("content", e.target.value)}
							className="w-full min-h-[400px] border border-jubilateBlue-300 dark:border-slate-500 rounded-md p-2 bg-white dark:bg-gray-900 text-black dark:text-white"
							placeholder="Entrez le contenu du texte..."
						/>
					</div>
				</main>
			)}
		</div>
	);
};

export default TextEditor;

import { TextInput } from "@/components";
import supabase, { type Text, textQuery } from "@/utils/supabase";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const TextEditor = () => {
	const { textId } = useParams();
	const navigate = useNavigate();
	const [text, setText] = useState<Text | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (textId) {
			textQuery(Number(textId)).then(({ data, error }) => {
				if (error) throw error;
				if (data) {
					setText(data);
					document.title = `Modifier "${data.title}" - Parolier`;
				}
				setLoading(false);
			});
		}
	}, [textId]);

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

	if (loading) return <div className="text-center">Loading...</div>;

	return (
		<div className="bg-white dark:bg-gray-800 min-h-screen">
			<div className="flex justify-between fixed left-0 top-0 w-full box-border p-4 bg-jubilateBlue-500 dark:bg-slate-900 z-10">
				<h2 className="text-2xl text-white font-bold font-flame">
					Modifier "{text?.title}"
				</h2>
				<button
					type="button"
					onClick={handleSave}
					className="bg-jubilateBlue-500 dark:bg-slate-900 text-white font-bold border-2 border-white px-2 py-1 rounded-md shadow-sm hover:bg-white dark:hover:bg-white hover:text-jubilateBlue-500 dark:hover:text-slate-900"
				>
					Enregistrer
				</button>
			</div>
			{text && (
				<main className="p-4 pt-20 text-black dark:text-white space-y-4">
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

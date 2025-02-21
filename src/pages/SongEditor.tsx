import type { Line, Strophe } from "@/assets/types";
import { type Song, songQuery } from "@/utils/supabase";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const supabaseUrl = "https://your-supabase-url.supabase.co";
const supabaseKey = "your-supabase-key";
const supabase = createClient(supabaseUrl, supabaseKey);

const SongEditor = () => {
	const { songId } = useParams();
	const [song, setSong] = useState<Song | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		songQuery(Number(songId)).then(({ data, error }) => {
			if (error) throw error;
			setSong(data);
			setLoading(false);
		});
	}, [songId]);

	const handleSave = async () => {
		if (!song) return;

		const songNoEmptyLines = {
			...song,
			strophes: song.strophes.map((strophe) => ({
				...strophe,
				content: strophe.content.filter((line) => line.text || line.chords),
			})),
		};

		console.log(songNoEmptyLines);

		const { error } = await supabase.from("songs").upsert(songNoEmptyLines);

		if (error) throw error;
		alert("Song saved successfully!");
	};

	const handleChange = (field: keyof Song, value: Strophe[] | string) => {
		setSong((prev) => (prev ? { ...prev, [field]: value } : null));
	};

	const handleStropheChange = (
		index: number,
		field: keyof Strophe,
		value: string | boolean | Line[],
	) => {
		if (!song) return;
		const newStrophes = [...song.strophes];
		newStrophes[index] = { ...newStrophes[index], [field]: value };
		if (field === "content") {
			// remove empty lines
			newStrophes[index].content = (value as Line[]).filter(
				(line) => line.text || line.chords,
			);
			// add one empty line at the end
			newStrophes[index].content.push({ text: "", chords: "" });
		}
		handleChange("strophes", newStrophes);
	};

	const addStrophe = (index: number) => {
		if (!song) return;
		const newStrophes = [
			...song.strophes.slice(0, index + 1),
			{
				content: [{ text: "", chords: "" }],
				type: "verse",
				repetition: false,
			} satisfies Strophe,
			...song.strophes.slice(index + 1),
		];
		handleChange("strophes", newStrophes);
	};

	const removeStrophe = (index: number) => {
		if (!song) return;
		const newStrophes = song.strophes.filter((_, i) => i !== index);
		handleChange("strophes", newStrophes);
	};

	if (loading) return <div className="text-center mt-4">Loading...</div>;
	if (error)
		return <div className="text-center text-red-500 mt-4">Error: {error}</div>;

	return (
		<div className="max-w-4xl mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Edit Song</h2>
			{song && (
				<div className="space-y-4">
					<div className="mb-4">
						<label className="block text-sm font-medium">
							Title:
							<input
								type="text"
								value={song.title}
								onChange={(e) => handleChange("title", e.target.value)}
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							/>
						</label>
					</div>
					<div>
						<h3 className="text-xl font-semibold mb-2">Strophes</h3>
						{song.strophes.map((strophe, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Idc
							<div key={index} className="border p-4 rounded-md mb-4">
								<div className="mb-2">
									<label className="block text-sm font-medium">
										Type:
										<select
											value={strophe.type}
											onChange={(e) =>
												handleStropheChange(index, "type", e.target.value)
											}
											className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
										>
											<option value="verse">Verse</option>
											<option value="chorus">Chorus</option>
											<option value="bridge">Bridge</option>
										</select>
									</label>
								</div>
								<div className="mb-2">
									<label className="block text-sm font-medium">
										Repetition:
										<input
											type="checkbox"
											checked={strophe.repetition}
											onChange={(e) =>
												handleStropheChange(
													index,
													"repetition",
													e.target.checked,
												)
											}
											className="mt-1 ml-2"
										/>
									</label>
								</div>
								<div>
									<h4 className="text-lg font-semibold mb-2">Content</h4>
									{strophe.content.map((line, lineIndex) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: Idc
											key={lineIndex}
											className="mb-2 grid grid-cols-2 gap-4"
										>
											<input
												type="text"
												value={line.text}
												onChange={(e) => {
													const newContent = [...strophe.content];
													newContent[lineIndex].text = e.target.value;
													handleStropheChange(index, "content", newContent);
												}}
												className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
											/>
											<input
												type="text"
												value={line.chords}
												onChange={(e) => {
													const newContent = [...strophe.content];
													newContent[lineIndex].chords = e.target.value;
													handleStropheChange(index, "content", newContent);
												}}
												className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
											/>
										</div>
									))}
								</div>
								<button
									type="button"
									onClick={() => removeStrophe(index)}
									className="mt-2 bg-red-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-red-600"
								>
									Supprimer strophe
								</button>
								<button
									type="button"
									onClick={() => addStrophe(index)}
									className="mt-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-600"
								>
									Insérer strophe
								</button>
							</div>
						))}
					</div>
					<button
						type="button"
						onClick={handleSave}
						className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600"
					>
						Enregistrer
					</button>
				</div>
			)}
		</div>
	);
};

export default SongEditor;

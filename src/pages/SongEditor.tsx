import type { Line, Strophe } from "@/assets/types";
import supabase, { songQuery, type Song } from "@/utils/supabase";

import { TextInput } from "@/components";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Json } from "../../database.types";

const SongEditor = () => {
	const { songId } = useParams();
	const [song, setSong] = useState<Song | null>(null);
	const [loading, setLoading] = useState(true);

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
				content: strophe.content.filter(
					(line) => line.text || line.chords,
				) as unknown as Json[],
			})),
		};

		const { error } = await supabase
			.from("songs")
			.update(songNoEmptyLines)
			.eq("id", song.id);

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

	if (loading) return <div className="text-center">Loading...</div>;

	return (
		<div className="max-w-4xl mx-auto p-4 text-black dark:text-white">
			<h2 className="text-2xl font-bold mb-4">Modifier "{song?.title}"</h2>
			{song && (
				<div className="space-y-4">
					<TextInput
						label="Title"
						value={song.title}
						onChange={(value) => handleChange("title", value)}
					/>
					<div>
						<h3 className="text-xl font-semibold mb-2">Strophes</h3>
						{song.strophes.map((strophe, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Idc
							<div key={index} className="border p-4 rounded-md mb-4">
								<div className="mb-2">
									<label className="text-sm font-medium">
										Type:
										<select
											value={strophe.type}
											onChange={(e) =>
												handleStropheChange(index, "type", e.target.value)
											}
											className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
										>
											<option value="verse">Verse</option>
											<option value="chorus">Chorus</option>
											<option value="bridge">Bridge</option>
										</select>
									</label>
								</div>
								<div className="mb-2">
									<label className="text-sm font-medium">
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
											className="ml-2"
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
											<TextInput
												value={line.text}
												onChange={(value) => {
													const newContent = [...strophe.content];
													newContent[lineIndex].text = value;
													handleStropheChange(index, "content", newContent);
												}}
											/>
											<TextInput
												value={line.chords}
												onChange={(value) => {
													const newContent = [...strophe.content];
													newContent[lineIndex].chords = value;
													handleStropheChange(index, "content", newContent);
												}}
											/>
										</div>
									))}
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => removeStrophe(index)}
										className="bg-red-500 text-white px-2 py-1 rounded-md shadow-sm hover:bg-red-600"
									>
										Supprimer strophe
									</button>
									<button
										type="button"
										onClick={() => addStrophe(index)}
										className="bg-green-500 text-white px-2 py-1 rounded-md shadow-sm hover:bg-green-600"
									>
										Insérer strophe
									</button>
									<button
										className="bg-blue-500 text-white px-2 py-1 rounded-md shadow-sm hover:bg-blue-600"
										type="button"
										onClick={() => {
											const newStrophes = [...song.strophes];
											newStrophes.push(JSON.parse(JSON.stringify(strophe)));
											handleChange("strophes", newStrophes);
										}}
									>
										Copier à la fin
									</button>
									{index > 0 && (
										<button
											className=" text-white px-2 py-1 rounded-md shadow-sm hover:bg-gray-100"
											type="button"
											onClick={() => {
												const newStrophes = [...song.strophes];
												[newStrophes[index - 1], newStrophes[index]] = [
													newStrophes[index],
													newStrophes[index - 1],
												];
												handleChange("strophes", newStrophes);
											}}
										>
											⬆️
										</button>
									)}
									{index < song.strophes.length - 1 && (
										<button
											className="text-white px-2 py-1 rounded-md shadow-sm hover:bg-gray-100"
											type="button"
											onClick={() => {
												const newStrophes = [...song.strophes];
												[newStrophes[index], newStrophes[index + 1]] = [
													newStrophes[index + 1],
													newStrophes[index],
												];
												handleChange("strophes", newStrophes);
											}}
										>
											⬇️
										</button>
									)}
									{strophe.content.length > 6 && (
										<div>
											<p>
												⚠️: Un couplet trop long peut dépasser sur les slides.
												Clickez pour{" "}
												<button
													type="button"
													onClick={() => {
														const firstHalf = strophe.content.slice(0, 4);
														const secondHalf = strophe.content.slice(4);
														const newStrophes = [...song.strophes];
														newStrophes[index].content = firstHalf;
														newStrophes.splice(index + 1, 0, {
															...strophe,
															content: secondHalf,
														});
														handleChange("strophes", newStrophes);
													}}
													className="inline hover:underline text-gray-500 hover:text-gray-700"
												>
													couper à la ligne 4
												</button>
											</p>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
					<button
						type="button"
						onClick={handleSave}
						className="bg-blue-500 text-white px-2 py-1 rounded-md shadow-sm hover:bg-blue-600"
					>
						Enregistrer
					</button>
				</div>
			)}
		</div>
	);
};

export default SongEditor;

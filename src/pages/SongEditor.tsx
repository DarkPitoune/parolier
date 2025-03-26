import type { Line, Strophe } from "@/assets/types";
import supabase, { songQuery, type Song } from "@/utils/supabase";

import { TextInput } from "@/components";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Json } from "../../database.types";
import clsx from "clsx";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";

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
		<div className="bg-white dark:bg-gray-800">
			<div className="flex justify-between fixed p-4 bg-jubilateBlue-500 dark:bg-slate-900 w-full">
				<h2 className="text-2xl text-white font-bold font-flame ">
					Modifier "{song?.title}"
				</h2>
				<button
					type="button"
					onClick={handleSave}
					className="bg-jubilateBlue-500 dark:bg-slate-900 text-white font-bold border-2 border-white px-2 py-1 rounded-md shadow-sm hover:bg-white dark:hover:bg-white hover:text-jubilateBlue-500 dark:hover:text-slate-900"
				>
					Enregistrer
				</button>
			</div>
			<div className="mx-20 p-4 pt-20 text-black dark:text-white  dark-bg-gray-900">
				{song && (
					<div className="space-y-4">
						<div className="border p-4 rounded-md border-jubilateBlue-100 dark:border-slate-500">
							<TextInput
								label="Titre"
								value={song.title}
								onChange={(value) => handleChange("title", value)}
							/>
						</div>
						<div>
							<h3 className="text-xl font-semibold mb-2">Strophes&nbsp;:</h3>
							{song.strophes.map((strophe, index) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									key={index}
									className={clsx(
										"border p-4 rounded-md mb-4",
										strophe.type === "verse" &&
											"bg-none border-jubilateBlue-100 dark:border-slate-500",
										strophe.type === "chorus" &&
											"bg-jubilateBlue-200  border-jubilateBlue-300 dark:bg-jubilateBlue-500 dark:bg-opacity-20 dark:border-jubilateBlue-500",
										strophe.type === "bridge" &&
											"bg-jubilateYellow bg-opacity-30  border-jubilateYellow border-opacity-40 dark:bg-opacity-40 dark:border-jubilateYellow",
									)}
								>
									<div className="mb-2">
										<label className="text-sm font-medium">
											<h4 className="text-lg font-semibold mb-2">
												Type&nbsp;:
											</h4>
											<select
												value={strophe.type}
												onChange={(e) =>
													handleStropheChange(index, "type", e.target.value)
												}
												className={clsx(
													"w-full border rounded-md shadow-sm p-1 sm:text-sm",
													strophe.type === "verse" &&
														"border-jubilateBlue-500 dark:focus:outline-slate-500 dark:bg-inherit dark:border-slate-700",
													strophe.type === "chorus" &&
														"border-jubilateBlue-500 dark:bg-inherit dark:border-jubilateBlue-500",
													strophe.type === "bridge" &&
														"border-jubilateYellow dark:bg-inherit dark:border-jubilateYellow",
												)}
											>
												<option value="verse">Couplet</option>
												<option value="chorus">Refrain</option>
												<option value="bridge">Pont</option>
											</select>
										</label>
									</div>
									<div className="mb-2">
										<label className="text-sm font-medium flex ">
											Répétition&nbsp;:
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
												className="ml-2 -mb-[2px]"
											/>
										</label>
									</div>
									<div>
										<h4 className="text-lg font-semibold mb-2">
											Contenu&nbsp;:
										</h4>
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
											className="bg-jubilateRed bg-opacity-85 text-white px-2 py-1 rounded-md shadow-sm hover:bg-opacity-100"
										>
											Supprimer strophe
										</button>
										<button
											type="button"
											onClick={() => addStrophe(index)}
											className="bg-jubilateGreen bg-opacity-85 text-white px-2 py-1 rounded-md shadow-sm hover:bg-opacity-100"
										>
											Insérer strophe
										</button>
										<button
											className="bg-jubilateBlue-500 bg-opacity-85 text-white px-2 py-1 rounded-md shadow-sm hover:bg-opacity-100"
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
												<ArrowUpIcon className="bg-jubilateBlue-500 bg-opacity-85 text-white w-8 p-2 rounded-md hover:bg-opacity-100" />
											</button>
										)}
										{index < song.strophes.length - 1 && (
											<button
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
												<ArrowDownIcon className="bg-jubilateBlue-500 bg-opacity-85 text-white w-8 p-2 rounded-md hover:bg-opacity-100" />
											</button>
										)}
										{strophe.content.length > 6 && (
											<div>
												<p>
													⚠️: Un couplet trop long peut dépasser sur les slides.
													Cliquez pour{" "}
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
					</div>
				)}
			</div>
		</div>
	);
};

export default SongEditor;

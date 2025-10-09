import type { Line, Strophe } from "@/assets/types";
import supabase, {
	allTagsQuery,
	type TaggedSong,
	taggedSongQuery,
	type Tags,
} from "@/utils/supabase";
import type { Json } from "../../database.types";

import { TextInput } from "@/components";
import { songEditorHelpOpen } from "@/components/Contexts/SettingsContext";
import { TagChip } from "@/components/TagChip";
import { ChevronRightIcon } from "@heroicons/react/16/solid";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

const SongEditor = () => {
	const { songId } = useParams();
	const [song, setSong] = useState<TaggedSong | null>(null);
	const [loading, setLoading] = useState(true);
	const [allTags, setAllTags] = useState<Tags>([]);
	const [selectedTags, setSelectedTags] = useState<number[]>([]);
	const [isSongEditorHelpOpen, setIsSongEditorHelpOpen] =
		useAtom(songEditorHelpOpen);

	useEffect(() => {
		taggedSongQuery(Number(songId)).then(({ data, error }) => {
			if (error) throw error;
			setSong(data);
			setSelectedTags(data.tags.map((tag) => tag.id));
			setLoading(false);
		});

		allTagsQuery().then(({ data, error }) => {
			if (error) throw error;
			data.sort((a, b) => a.id - b.id);
			setAllTags(data);
		});
	}, [songId]);

	const handleSave = async () => {
		if (!song) return;
		const { strophes, title, sheet_music_url } = song;

		const songNoEmptyLines = {
			title,
			sheet_music_url,
			strophes: strophes.map((strophe) => ({
				...strophe,
				content:
					typeof strophe.content === "string"
						? strophe.content
						: strophe.content.filter((line) => line.text || line.chords),
			})) as Json[],
		};

		const { error: errorSong } = await supabase
			.from("songs")
			.update(songNoEmptyLines)
			.eq("id", song.id);

		const { error: errorTags } = await supabase
			.from("song_tag")
			.delete()
			.eq("song_id", song.id);

		const { error: errorInsertTags } = await supabase.from("song_tag").insert(
			selectedTags.map((tagId) => ({
				song_id: song.id,
				tag_id: tagId,
			})),
		);

		if (errorSong || errorTags || errorInsertTags)
			throw errorSong || errorTags || errorInsertTags;
		toast.success("Modifications enregistrées");
	};

	const handleChange = (field: keyof TaggedSong, value: Strophe[] | string) => {
		setSong((prev) => (prev ? { ...prev, [field]: value } : null));
	};

	const handleStropheChange = (
		index: number,
		field: "content" | "type" | "repetition",
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

	const addSection = (index: number) => {
		if (!song) return;
		const newStrophes = [
			...song.strophes.slice(0, index + 1),
			{
				type: "section",
				content: "Nouvelle section",
			} satisfies Strophe,
			...song.strophes.slice(index + 1),
		];
		handleChange("strophes", newStrophes);
	};

	const handleSectionChange = (index: number, content: string) => {
		if (!song) return;
		const newStrophes = [...song.strophes];
		if (newStrophes[index].type === "section") {
			newStrophes[index] = { ...newStrophes[index], content };
			handleChange("strophes", newStrophes);
		}
	};

	const toggleTag = (tagId: number) => {
		setSelectedTags((oldTags) => {
			if (!oldTags.includes(tagId)) return oldTags.concat([tagId]);
			return oldTags.filter((id) => id !== tagId);
		});
	};

	if (loading) return <div className="text-center">Loading...</div>;

	return (
		<div className="bg-white dark:bg-gray-800">
			<div className="flex justify-between fixed left-0 top-0 w-full box-border p-4 bg-jubilateBlue-500 dark:bg-slate-900">
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
			{song && (
				<main className="p-4 pt-20 text-black dark:text-white  dark-bg-gray-900 space-y-4">
					<div className="border p-4 rounded-md border-jubilateBlue-100 dark:border-slate-500">
						<TextInput
							label="Titre"
							value={song.title}
							onChange={(value) => handleChange("title", value)}
						/>
					</div>
					{allTags.map((tag) => (
						<TagChip
							tag={tag}
							onClick={() => toggleTag(tag.id)}
							key={tag.id}
							inverted={selectedTags.includes(tag.id)}
							iconOnly
							outline
						/>
					))}
					<div className="flex flex-col gap-4">
						<h3 className="text-xl font-semibold mb-2">Strophes&nbsp;:</h3>
						<button
							type="button"
							className="text-left border p-4 rounded-md bg-lime-100  border-lime-300 dark:bg-lime-500 dark:bg-opacity-50 dark:border-lime-600"
							onClick={() => setIsSongEditorHelpOpen((v) => !v)}
						>
							<div className="flex gap-2 items-center">
								<ChevronRightIcon
									className={clsx(
										"size-6 transition-transform",
										isSongEditorHelpOpen ? "rotate-90" : "",
									)}
								/>
								<h1 className="text-xl font-semibold">
									Comment modifier un chant ?
								</h1>
							</div>
							{isSongEditorHelpOpen && (
								<>
									<p>
										Ajoutez toutes les strophes telles qu'elles seraient
										chantées, dans l'ordre.
									</p>
									<p>
										Si un refrain revient deux fois, insérez le deux fois. Si un
										refrain réapparait de façon identique (pas de changement
										d'accord, de parole), cochez la case "Répétition" pour
										indiquer que l'on peut le cacher en désactivant l'option de
										l'app.
									</p>
									<p>
										Pour éviter que les slides ne dépassent, limitez vous à des
										strophes de 4 lignes maximum, quitte à couper un couplet en
										plusieurs strophes.
									</p>
								</>
							)}
						</button>
						{song.strophes.map((strophe, index) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								key={index}
								className={clsx(
									"border p-4 rounded-md",
									strophe.type === "verse" &&
										"bg-none border-jubilateBlue-100 dark:border-slate-500",
									strophe.type === "chorus" &&
										"bg-jubilateBlue-200  border-jubilateBlue-300 dark:bg-jubilateBlue-500 dark:bg-opacity-20 dark:border-jubilateBlue-500",
									strophe.type === "bridge" &&
										"bg-jubilateYellow bg-opacity-30  border-jubilateYellow border-opacity-40 dark:bg-opacity-40 dark:border-jubilateYellow",
									strophe.type === "section" &&
										"bg-purple-100 border-purple-300 dark:bg-purple-500 dark:bg-opacity-20 dark:border-purple-500",
								)}
							>
								{strophe.type === "section" ? (
									// Section rendering
									<div>
										<div className="mb-2">
											<h4 className="text-lg font-semibold mb-2">
												Section&nbsp;:
											</h4>
											<TextInput
												value={strophe.content}
												onChange={(value) => handleSectionChange(index, value)}
											/>
										</div>
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => removeStrophe(index)}
												className="bg-jubilateRed bg-opacity-85 text-white px-2 py-1 rounded-md shadow-sm hover:bg-opacity-100"
											>
												Supprimer section
											</button>
											<button
												type="button"
												onClick={() => addSection(index)}
												className="bg-purple-500 bg-opacity-85 text-white px-2 py-1 rounded-md shadow-sm hover:bg-opacity-100"
											>
												Insérer section
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
										</div>
									</div>
								) : (
									// Regular strophe rendering
									<>
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
														"w-full border rounded-md shadow-sm p-1 sm:text-sm bg-transparent",
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
											<label className="text-sm font-medium flex gap-1 items-center">
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
												type="button"
												onClick={() => addSection(index)}
												className="bg-purple-500 bg-opacity-85 text-white px-2 py-1 rounded-md shadow-sm hover:bg-opacity-100"
											>
												Insérer section
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
														⚠️: Un couplet trop long peut dépasser sur les
														slides. Cliquez pour{" "}
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
									</>
								)}
							</div>
						))}
						<div className="flex gap-2 mt-4">
							<button
								type="button"
								onClick={() => {
									if (!song) return;
									const newStrophes = [
										...song.strophes,
										{
											content: [{ text: "", chords: "" }],
											type: "verse",
											repetition: false,
										} satisfies Strophe,
									];
									handleChange("strophes", newStrophes);
								}}
								className="bg-jubilateGreen bg-opacity-85 text-white px-4 py-2 rounded-md shadow-sm hover:bg-opacity-100"
							>
								Ajouter strophe à la fin
							</button>
							<button
								type="button"
								onClick={() => {
									if (!song) return;
									const newStrophes = [
										...song.strophes,
										{
											type: "section",
											content: "Nouvelle section",
										} satisfies Strophe,
									];
									handleChange("strophes", newStrophes);
								}}
								className="bg-purple-500 bg-opacity-85 text-white px-4 py-2 rounded-md shadow-sm hover:bg-opacity-100"
							>
								Ajouter section à la fin
							</button>
						</div>
					</div>
				</main>
			)}
		</div>
	);
};

export default SongEditor;

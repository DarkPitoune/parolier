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
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CameraIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
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

	// Image-to-lyrics state
	const [isProcessing, setIsProcessing] = useState(false);
	const [processingStep, setProcessingStep] = useState<string>("");
	const [suggestedLyrics, setSuggestedLyrics] = useState<Strophe[] | null>(
		null,
	);
	const [showWarning, setShowWarning] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	const compressImage = useCallback((file: File): Promise<File> => {
		return new Promise((resolve) => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d")!;
			const img = new Image();

			img.onload = () => {
				// Set maximum dimensions
				const maxWidth = 1920;
				const maxHeight = 1920;

				let { width, height } = img;

				// Calculate new dimensions maintaining aspect ratio
				if (width > maxWidth || height > maxHeight) {
					if (width > height) {
						height = (height * maxWidth) / width;
						width = maxWidth;
					} else {
						width = (width * maxHeight) / height;
						height = maxHeight;
					}
				}

				canvas.width = width;
				canvas.height = height;

				// Draw and compress
				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (blob) {
							const compressedFile = new File([blob], file.name, {
								type: "image/jpeg",
								lastModified: Date.now(),
							});
							resolve(compressedFile);
						} else {
							resolve(file); // Fallback to original if compression fails
						}
					},
					"image/jpeg",
					0.8, // 80% quality
				);
			};

			img.onerror = () => resolve(file); // Fallback to original if loading fails
			img.src = URL.createObjectURL(file);
		});
	}, []);

	const handleImageUpload = useCallback(
		async (file: File) => {
			if (!file.type.startsWith("image/")) {
				toast.error("Veuillez sélectionner un fichier image");
				return;
			}

			setIsProcessing(true);
			setProcessingStep("Compression de l'image...");

			try {
				// Compress image before upload
				const compressedFile = await compressImage(file);

				setProcessingStep("Téléchargement...");

				// Upload compressed image to Supabase Storage
				const fileName = `song-${Date.now()}-${compressedFile.name}`;
				const { error: uploadError } = await supabase.storage
					.from("song-images")
					.upload(fileName, compressedFile);

				if (uploadError) {
					throw new Error(`Erreur de téléchargement: ${uploadError.message}`);
				}

				setProcessingStep("Traitement de l'image...");

				// Get public URL
				const {
					data: { publicUrl },
				} = supabase.storage.from("song-images").getPublicUrl(fileName);

				setProcessingStep("Génération des paroles...");

				// Call edge function
				const { data: result, error: functionError } =
					await supabase.functions.invoke("process-image-to-lyrics", {
						body: { imageUrl: publicUrl },
					});

				if (functionError) {
					throw new Error(`Erreur de traitement: ${functionError.message}`);
				}

				if (!result.success) {
					throw new Error(
						result.error || "Erreur lors du traitement de l'image",
					);
				}

				if (!result.strophes || result.strophes.length === 0) {
					throw new Error("Aucune parole n'a pu être extraite de cette image");
				}

				// Update song title if provided
				if (result.title && result.title.trim()) {
					handleChange("title", result.title.trim());
				}

				setSuggestedLyrics(result.strophes);
				toast.success("Paroles générées avec succès!");
			} catch (error) {
				console.error("Error processing image:", error);
				toast.error(
					error instanceof Error ? error.message : "Erreur lors du traitement",
				);
			} finally {
				setIsProcessing(false);
				setProcessingStep("");
			}
		},
		[compressImage],
	);

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				handleImageUpload(file);
			}
		},
		[handleImageUpload],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const file = e.dataTransfer.files[0];
			if (file) {
				handleImageUpload(file);
			}
		},
		[handleImageUpload],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
	}, []);

	const applySuggestedLyrics = useCallback(() => {
		if (suggestedLyrics && song) {
			handleChange("strophes", suggestedLyrics);
			setSuggestedLyrics(null);
			setShowWarning(false);
			toast.success("Paroles appliquées avec succès!");
		}
	}, [suggestedLyrics, song, handleChange]);

	// Warn user before leaving page during processing or with unsaved suggestions
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isProcessing || suggestedLyrics) {
				e.preventDefault();
				e.returnValue =
					"Vous avez un traitement en cours ou des paroles suggérées non appliquées. Êtes-vous sûr de vouloir quitter?";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isProcessing, suggestedLyrics]);

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

					{/* Image Upload Section */}
					<div className="border p-4 rounded-md border-jubilateBlue-100 dark:border-slate-500">
						<h3 className="text-lg font-semibold mb-3">
							Générer à partir d'une image
						</h3>

						{!isProcessing ? (
							<div
								onDrop={handleDrop}
								onDragOver={handleDragOver}
								className="border-2 border-dashed border-jubilateBlue-300 dark:border-slate-400 rounded-lg p-6 text-center cursor-pointer hover:bg-jubilateBlue-50 dark:hover:bg-slate-700 transition-colors"
								onClick={() => fileInputRef.current?.click()}
							>
								<CameraIcon className="mx-auto h-12 w-12 text-jubilateBlue-400 dark:text-slate-400 mb-3" />
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
									Cliquez pour télécharger ou glissez une image
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									JPG, PNG, WebP jusqu'à 10MB
								</p>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									onChange={handleFileSelect}
									className="hidden"
								/>
							</div>
						) : (
							<div className="text-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jubilateBlue-500 mx-auto mb-3"></div>
								<p className="text-sm font-medium text-jubilateBlue-600 dark:text-jubilateBlue-400">
									{processingStep}
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Cela peut prendre 30-60 secondes...
								</p>
								<div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-200 dark:border-yellow-600 rounded-md">
									<p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
										⚠️ Ne fermez pas cette page pendant le traitement
									</p>
									<p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
										Le processus sera interrompu et devra être relancé
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Suggested Lyrics Section */}
					{suggestedLyrics && (
						<div className="border p-4 rounded-md border-green-200 bg-green-50 dark:border-green-600 dark:bg-green-900 dark:bg-opacity-20">
							<div className="flex justify-between items-start mb-3">
								<h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
									Paroles suggérées
								</h3>
								<div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900 dark:bg-opacity-30 px-2 py-1 rounded">
									⚠️ Ne fermez pas la page
								</div>
							</div>

							<div className="bg-white dark:bg-gray-800 p-3 rounded border mb-4 max-h-40 overflow-y-auto">
								{suggestedLyrics.map((strophe, index) => (
									<div key={index} className="mb-2">
										<div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
											{strophe.type === "verse"
												? "Couplet"
												: strophe.type === "chorus"
													? "Refrain"
													: strophe.type === "bridge"
														? "Pont"
														: "Section"}
										</div>
										{typeof strophe.content === "string" ? (
											<p className="text-sm">{strophe.content}</p>
										) : (
											strophe.content.map((line, lineIndex) => (
												<div key={lineIndex} className="text-sm">
													{line.chords && (
														<span className="text-jubilateBlue-600 dark:text-jubilateBlue-400 text-xs font-mono">
															{line.chords}{" "}
														</span>
													)}
													{line.text}
												</div>
											))
										)}
									</div>
								))}
							</div>

							<div className="flex gap-2 flex-wrap">
								<button
									type="button"
									onClick={() => setShowWarning(true)}
									className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
								>
									Appliquer les paroles suggérées
								</button>
								<button
									type="button"
									onClick={() => setSuggestedLyrics(null)}
									className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
								>
									Ignorer
								</button>
							</div>
						</div>
					)}

					{/* Warning Modal */}
					{showWarning && (
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
							<div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
								<h3 className="text-lg font-semibold mb-3 text-red-600 dark:text-red-400">
									⚠️ Attention
								</h3>
								<p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
									Cette action remplacera toutes les paroles et accords actuels
									par le contenu généré. Cette action ne peut pas être annulée.
								</p>
								<div className="flex gap-2 justify-end">
									<button
										type="button"
										onClick={() => setShowWarning(false)}
										className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
									>
										Annuler
									</button>
									<button
										type="button"
										onClick={applySuggestedLyrics}
										className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
									>
										Remplacer les paroles
									</button>
								</div>
							</div>
						</div>
					)}
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

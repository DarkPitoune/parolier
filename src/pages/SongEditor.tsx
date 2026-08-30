import type { Line, Strophe } from "@/assets/types";
import { useSaveSongEdit } from "@/hooks/queries/useSongQueries";
import { sanitizeNbspString, sanitizeStrophes } from "@/utils/sanitizeNbsp";
import supabase, {
	allTagsQuery,
	type TaggedSong,
	taggedSongQuery,
	type Tags,
} from "@/utils/supabase";

import { PageHeader, TextInput } from "@/components";
import { songEditorHelpOpen } from "@/components/Contexts/SettingsContext";
import { TagChip } from "@/components/TagChip";
import { ChevronRightIcon } from "@heroicons/react/16/solid";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	DocumentTextIcon,
	TrashIcon,
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

	// PDF upload state
	const [isPdfUploading, setIsPdfUploading] = useState(false);
	const pdfInputRef = useRef<HTMLInputElement>(null);

	// Chord copy state
	const [copySourceIndex, setCopySourceIndex] = useState<number | null>(null);
	const [pasteFlash, setPasteFlash] = useState<{ index: number } | null>(null);

	useEffect(() => {
		taggedSongQuery(Number(songId)).then(({ data, error }) => {
			if (error) throw error;
			setSong(data);
			setSelectedTags(data.tags.map((tag) => tag.id));
			setLoading(false);
			document.title = `Modifier "${data.title}" - Parolier`;
		});

		allTagsQuery().then(({ data, error }) => {
			if (error) throw error;
			data.sort((a, b) => a.id - b.id);
			setAllTags(data);
		});
	}, [songId]);

	const saveSongEdit = useSaveSongEdit();

	const handleSave = () => {
		if (!song) return;
		const { strophes, title, sheet_music_url } = song;

		const cleanedStrophes = sanitizeStrophes(
			strophes.map((strophe) => ({
				...strophe,
				content:
					typeof strophe.content === "string"
						? strophe.content
						: strophe.content.filter((line) => line.text || line.chords),
			})) as Strophe[],
		);

		saveSongEdit.mutate({
			songId: song.id,
			title: sanitizeNbspString(title),
			sheetMusicUrl: sheet_music_url,
			strophes: cleanedStrophes,
			tagIds: selectedTags,
		});
	};

	const handleChange = useCallback(
		(field: keyof TaggedSong, value: Strophe[] | string | null) => {
			setSong((prev) => (prev ? { ...prev, [field]: value } : null));
		},
		[],
	);

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

	const copyChordsToStrophe = (targetIndex: number) => {
		if (!song || copySourceIndex === null || targetIndex === copySourceIndex)
			return;
		const source = song.strophes[copySourceIndex];
		const target = song.strophes[targetIndex];
		if (source.type === "section" || target.type === "section") return;

		const sourceLines = source.content;
		const newContent = target.content.map((line, i) =>
			i < sourceLines.length
				? { ...line, chords: sourceLines[i].chords }
				: line,
		);
		const newStrophes = [...song.strophes];
		newStrophes[targetIndex] = { ...target, content: newContent };
		handleChange("strophes", newStrophes);
		setPasteFlash({ index: targetIndex });
	};

	const toggleTag = (tagId: number) => {
		setSelectedTags((oldTags) => {
			if (!oldTags.includes(tagId)) return oldTags.concat([tagId]);
			return oldTags.filter((id) => id !== tagId);
		});
	};

	const handlePdfUpload = useCallback(
		async (file: File) => {
			if (!file.type.includes("pdf")) {
				toast.error("Veuillez sélectionner un fichier PDF");
				return;
			}

			if (!song) {
				toast.error("Erreur: chanson non trouvée");
				return;
			}

			setIsPdfUploading(true);

			try {
				// Create filename with song title (replace spaces with underscores)
				const sanitizedTitle = song.title
					.replace(/\s+/g, "_")
					.replace(/[^\w.-]/g, "");
				const fileName = `${sanitizedTitle}.pdf`;

				// Upload PDF to Supabase Storage
				const { error: uploadError } = await supabase.storage
					.from("sheet-music")
					.upload(fileName, file, { upsert: true });

				if (uploadError) {
					throw new Error(`Erreur de téléchargement: ${uploadError.message}`);
				}

				// Update song with sheet music URL
				const sheetMusicUrl = `/sheet-music/${fileName}`;
				handleChange("sheet_music_url", sheetMusicUrl);

				toast.success("Partition PDF ajoutée avec succès!");
			} catch (error) {
				console.error("Error uploading PDF:", error);
				toast.error(
					error instanceof Error
						? error.message
						: "Erreur lors du téléchargement",
				);
			} finally {
				setIsPdfUploading(false);
			}
		},
		[song, handleChange],
	);

	const handlePdfFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				handlePdfUpload(file);
			}
		},
		[handlePdfUpload],
	);

	const handleDeletePdf = useCallback(async () => {
		if (!song?.sheet_music_url) return;

		try {
			// Extract filename from URL
			const fileName = song.sheet_music_url.replace("/sheet-music/", "");

			// Delete from Supabase Storage
			const { error } = await supabase.storage
				.from("sheet-music")
				.remove([fileName]);

			if (error) {
				throw new Error(`Erreur de suppression: ${error.message}`);
			}

			// Update song to remove sheet music URL
			handleChange("sheet_music_url", null);
			toast.success("Partition supprimée avec succès!");
		} catch (error) {
			console.error("Error deleting PDF:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Erreur lors de la suppression",
			);
		}
	}, [song?.sheet_music_url, handleChange]);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isPdfUploading) {
				e.preventDefault();
				e.returnValue =
					"Le téléchargement de la partition est en cours. Êtes-vous sûr de vouloir quitter?";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isPdfUploading]);

	useEffect(() => {
		if (copySourceIndex === null) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setCopySourceIndex(null);
		};
		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target) return;
			if (
				target.closest("[data-strophe-card]") ||
				target.closest("[data-copy-banner]")
			)
				return;
			setCopySourceIndex(null);
		};
		document.addEventListener("keydown", handleKey);
		const clickTimer = setTimeout(() => {
			document.addEventListener("click", handleClick);
		}, 0);
		return () => {
			document.removeEventListener("keydown", handleKey);
			document.removeEventListener("click", handleClick);
			clearTimeout(clickTimer);
		};
	}, [copySourceIndex]);

	useEffect(() => {
		if (!pasteFlash) return;
		const timer = setTimeout(() => setPasteFlash(null), 600);
		return () => clearTimeout(timer);
	}, [pasteFlash]);

	if (loading) return <div className="text-center">Loading...</div>;

	return (
		<div className="bg-white dark:bg-gray-800">
			<PageHeader
				variant="detail"
				title={`Modifier "${song?.title}"`}
				right={
					<button
						type="button"
						onClick={handleSave}
						disabled={saveSongEdit.isPending}
						className="bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white font-bold px-2 py-1 rounded-md shadow-xs hover:bg-jubilateBlue-700 dark:hover:bg-jubilateBlue-500 disabled:opacity-50"
					>
						{saveSongEdit.isPending ? "Enregistrement..." : "Enregistrer"}
					</button>
				}
			/>
			{song && (
				<main className="p-4 text-black dark:text-white space-y-4">
					<div className="border p-4 rounded-md border-jubilateBlue-100 dark:border-slate-500">
						<TextInput
							label="Titre"
							value={song.title}
							onChange={(value) => handleChange("title", value)}
						/>
					</div>

					{/* PDF Sheet Music Section */}
					<div className="border p-4 rounded-md border-jubilateBlue-100 dark:border-slate-500">
						<h3 className="text-lg font-semibold mb-3">Partition (PDF)</h3>

						{song.sheet_music_url ? (
							<div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-600 rounded-md p-3">
								<div className="flex items-center gap-2">
									<DocumentTextIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
									<span className="text-sm text-green-800 dark:text-green-200">
										Partition PDF disponible
									</span>
								</div>
								<button
									type="button"
									onClick={handleDeletePdf}
									className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-sm text-sm transition-colors"
								>
									<TrashIcon className="h-4 w-4" />
									Supprimer
								</button>
							</div>
						) : (
							<>
								{!isPdfUploading ? (
									<div
										className="border-2 border-dashed border-jubilateBlue-300 dark:border-slate-400 rounded-lg p-4 text-center cursor-pointer hover:bg-jubilateBlue-50 dark:hover:bg-slate-700 transition-colors"
										onClick={() => pdfInputRef.current?.click()}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												pdfInputRef.current?.click();
											}
										}}
										tabIndex={0}
										role="button"
										aria-label="Upload PDF"
									>
										<DocumentTextIcon className="mx-auto h-8 w-8 text-jubilateBlue-400 dark:text-slate-400 mb-2" />
										<p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
											Cliquez pour ajouter une partition PDF
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											Le fichier sera renommé avec le titre du chant
										</p>
										<input
											ref={pdfInputRef}
											type="file"
											accept=".pdf,application/pdf"
											onChange={handlePdfFileSelect}
											className="hidden"
										/>
									</div>
								) : (
									<div className="text-center py-4">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-jubilateBlue-500 mx-auto mb-2" />
										<p className="text-sm font-medium text-jubilateBlue-600 dark:text-jubilateBlue-400">
											Téléchargement de la partition...
										</p>
									</div>
								)}
							</>
						)}
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
							className="text-left border p-4 rounded-md bg-lime-100  border-lime-300 dark:bg-lime-500/50 dark:border-lime-600"
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
						{song.strophes.map((strophe, index) => {
							const isCopySource = copySourceIndex === index;
							const isEligibleTarget =
								copySourceIndex !== null &&
								!isCopySource &&
								strophe.type !== "section";
							const isJustPasted = pasteFlash?.index === index;
							return (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									key={index}
									data-strophe-card
									className={clsx(
										"border p-4 rounded-md relative transition-shadow",
										strophe.type === "verse" &&
											"bg-none border-jubilateBlue-100 dark:border-slate-500",
										strophe.type === "chorus" &&
											"bg-jubilateBlue-200  border-jubilateBlue-300 dark:bg-jubilateBlue-500/20 dark:border-jubilateBlue-500",
										strophe.type === "bridge" &&
											"bg-jubilateYellow-400/30  border-jubilateYellow-400/40 dark:bg-jubilateYellow/40 dark:border-jubilateYellow-400",
										strophe.type === "section" &&
											"bg-purple-100 border-purple-300 dark:bg-purple-500/20 dark:border-purple-500",
										isCopySource &&
											"ring-2 ring-jubilateBlue-500 ring-offset-2 dark:ring-offset-gray-800",
										isJustPasted &&
											"ring-2 ring-jubilateGreen-500 ring-offset-2 dark:ring-offset-gray-800",
										isEligibleTarget &&
											"cursor-pointer hover:ring-2 hover:ring-jubilateBlue-300 hover:ring-offset-2 dark:hover:ring-offset-gray-800",
									)}
								>
									{isCopySource && (
										<div className="absolute -top-3 left-3 z-20 bg-jubilateBlue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow">
											Source des accords
										</div>
									)}
									{isEligibleTarget && (
										<button
											type="button"
											onClick={() => copyChordsToStrophe(index)}
											aria-label="Coller les accords ici"
											className="group absolute inset-0 z-10 rounded-md cursor-pointer bg-transparent hover:bg-jubilateBlue-500/5 transition-colors"
										>
											<span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
												<span className="bg-jubilateBlue-500 text-white text-sm font-medium px-3 py-1 rounded-full shadow">
													Coller les accords ici
												</span>
											</span>
										</button>
									)}
									{strophe.type === "section" ? (
										// Section rendering
										<div>
											<div className="mb-2">
												<h4 className="text-lg font-semibold mb-2">
													Section&nbsp;:
												</h4>
												<TextInput
													value={strophe.content}
													onChange={(value) =>
														handleSectionChange(index, value)
													}
												/>
											</div>
											<div className="flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() => removeStrophe(index)}
													className="bg-jubilateRed-400 text-white px-2 py-1 rounded-md shadow-xs hover:bg-jubilateRed-500 text-sm"
												>
													Supprimer section
												</button>
												<button
													type="button"
													onClick={() => addSection(index)}
													className="bg-jubilateBlue-400 text-white px-2 py-1 rounded-md shadow-xs hover:bg-jubilateBlue-500 text-sm"
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
														<ArrowUpIcon className="bg-jubilateBlue-500/85 text-white w-8 p-2 rounded-md hover:bg-jubilateBlue-500" />
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
														<ArrowDownIcon className="bg-jubilateBlue-500/85 text-white w-8 p-2 rounded-md hover:bg-jubilateBlue-500" />
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
															"w-full border rounded-md shadow-xs p-1 sm:text-sm bg-transparent",
															strophe.type === "verse" &&
																"border-jubilateBlue-500 dark:focus:outline-slate-500 dark:bg-inherit dark:border-slate-700",
															strophe.type === "chorus" &&
																"border-jubilateBlue-500 dark:bg-inherit dark:border-jubilateBlue-500",
															strophe.type === "bridge" &&
																"border-jubilateYellow-400 dark:bg-inherit dark:border-jubilateYellow-400",
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
																handleStropheChange(
																	index,
																	"content",
																	newContent,
																);
															}}
														/>
														<TextInput
															value={line.chords}
															onChange={(value) => {
																const newContent = [...strophe.content];
																newContent[lineIndex].chords = value;
																handleStropheChange(
																	index,
																	"content",
																	newContent,
																);
															}}
														/>
													</div>
												))}
											</div>
											<div className="flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() => removeStrophe(index)}
													className="bg-jubilateRed-400 text-white px-2 py-1 rounded-md shadow-xs hover:bg-jubilateRed-500 text-sm"
												>
													Supprimer strophe
												</button>
												<button
													type="button"
													onClick={() => addStrophe(index)}
													className="bg-jubilateGreen-400 text-white px-2 py-1 rounded-md shadow-xs hover:bg-jubilateGreen-500 text-sm"
												>
													Insérer strophe
												</button>
												<button
													type="button"
													onClick={() => addSection(index)}
													className="bg-jubilateBlue-400 text-white px-2 py-1 rounded-md shadow-xs hover:bg-jubilateBlue-500 text-sm"
												>
													Insérer section
												</button>
												<button
													className="bg-jubilateBlue-400 text-white px-2 py-1 rounded-md shadow-xs hover:bg-jubilateBlue-500 text-sm"
													type="button"
													onClick={() => {
														const newStrophes = [...song.strophes];
														newStrophes.push(
															JSON.parse(JSON.stringify(strophe)),
														);
														handleChange("strophes", newStrophes);
													}}
												>
													Copier à la fin
												</button>
												<button
													type="button"
													onClick={() =>
														setCopySourceIndex((curr) =>
															curr === index ? null : index,
														)
													}
													className={clsx(
														"px-2 py-1 rounded-md shadow-xs text-sm text-white",
														isCopySource
															? "bg-jubilateBlue-700 hover:bg-jubilateBlue-800"
															: "bg-jubilateBlue-500/85 hover:bg-jubilateBlue-500",
													)}
												>
													{isCopySource
														? "Annuler la copie"
														: "Copier les accords"}
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
														<ArrowUpIcon className="bg-jubilateBlue-500/85 text-white w-8 p-2 rounded-md hover:bg-jubilateBlue-500" />
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
														<ArrowDownIcon className="bg-jubilateBlue-500/85 text-white w-8 p-2 rounded-md hover:bg-jubilateBlue-500" />
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
							);
						})}
						<div className="flex flex-wrap gap-2 mt-4">
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
								className="bg-jubilateGreen-400 text-white px-4 py-2 rounded-md shadow-xs hover:bg-jubilateGreen-500 text-sm"
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
								className="bg-purple-500/85 text-white px-4 py-2 rounded-md shadow-xs hover:bg-purple-500 text-sm"
							>
								Ajouter section à la fin
							</button>
						</div>
					</div>
					{copySourceIndex !== null && (
						<div
							data-copy-banner
							className="fixed bottom-4 inset-x-0 mx-auto w-fit z-40 flex items-center gap-3 bg-jubilateBlue-600 text-white px-4 py-2 rounded-full shadow-lg"
						>
							<span className="text-sm">
								Sélectionnez les couplets où copier les accords
							</span>
							<button
								type="button"
								onClick={() => setCopySourceIndex(null)}
								className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-sm"
							>
								Annuler (Échap)
							</button>
						</div>
					)}
				</main>
			)}
		</div>
	);
};

export default SongEditor;

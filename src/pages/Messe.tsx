import {
	PageHeader,
	SettingsSidePanel,
	SongPickerInline,
	useLeader,
} from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel";
import { useAllTaggedSongs } from "@/hooks/queries/useSongQueries";
import {
	type SongSuggestion,
	useMasseSuggestions,
} from "@/hooks/useMasseSuggestions";
import { queryKeys } from "@/utils/queryKeys";
import {
	newNamedSetlistMutation,
	setlistItemAppendMutation,
} from "@/utils/supabase";
import {
	ArrowPathIcon,
	CalendarIcon,
	SparklesIcon,
} from "@heroicons/react/16/solid";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface LiturgicalInformation {
	date: string;
	zone_liturgique: string;
	couleur: string;
	temps_liturgique: string;
	semaine: string;
	jour: string;
	fete?: string;
	mémoire?: string;
}

interface Lecture {
	type: string;
	refrain_psalmique?: string;
	titre: string;
	contenu: string;
	ref: string;
	intro_lue?: string;
	verset_evangile?: string;
}

interface Messe {
	nom: string;
	lectures: Lecture[];
}

interface MesseData {
	informations: LiturgicalInformation;
	messes: Messe[];
}

const ROLE_LABELS: Record<SongSuggestion["role"], string> = {
	entree: "Chant d'entrée",
	offertoire: "Chant d'offertoire",
	communion: "Chant de communion",
	envoi: "Chant d'envoi",
};

function SuggestionCard({
	suggestion,
	onSwap,
}: {
	suggestion: SongSuggestion;
	onSwap: (songId: number, songTitle: string) => void;
}) {
	const [showPicker, setShowPicker] = useState(false);

	return (
		<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
			<h4 className="text-sm font-semibold text-jubilateBlue-600 dark:text-jubilateBlue-400 mb-2">
				{ROLE_LABELS[suggestion.role]}
			</h4>
			<Link
				to={`/songs/${suggestion.songId}`}
				className="text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-jubilateBlue-600 dark:hover:text-jubilateBlue-400"
			>
				{suggestion.songTitle}
			</Link>
			<p className="text-sm text-gray-500 dark:text-gray-400 italic mt-1">
				{suggestion.reasoning}
			</p>

			{suggestion.alternatives.length > 0 && (
				<div className="mt-3">
					<p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
						Alternatives :
					</p>
					<div className="flex flex-wrap gap-2">
						{suggestion.alternatives.map((alt) => (
							<button
								key={alt.songId}
								type="button"
								className="text-sm text-jubilateBlue-600 dark:text-jubilateBlue-400 hover:underline"
								onClick={() => onSwap(alt.songId, alt.songTitle)}
							>
								{alt.songTitle}
							</button>
						))}
					</div>
				</div>
			)}

			<button
				type="button"
				className="mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
				onClick={() => setShowPicker(!showPicker)}
			>
				{showPicker ? "Fermer" : "Choisir un autre chant"}
			</button>

			{showPicker && (
				<div className="mt-2 h-64 border border-gray-200 dark:border-gray-600 rounded-sm overflow-hidden">
					<SongPickerInline
						onSongSelect={(songId) => {
							onSwap(songId, "");
							setShowPicker(false);
						}}
					/>
				</div>
			)}
		</div>
	);
}

function Messe() {
	const [selectedDate, setSelectedDate] = useState(() => {
		const today = new Date();
		return today.toISOString().split("T")[0];
	});
	const [messeData, setMesseData] = useState<MesseData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);
	const [creatingSetlist, setCreatingSetlist] = useState(false);
	const { leader } = useLeader();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: allSongs } = useAllTaggedSongs();
	const {
		suggestions,
		liturgicalSummary,
		loading: suggestionsLoading,
		error: suggestionsError,
		suggest,
		regenerate,
		setSuggestions,
	} = useMasseSuggestions();

	const fetchMesseData = useCallback(async (date: string) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`https://api.aelf.org/v1/messes/${date}/france`,
			);

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Aucune donnée disponible pour cette date");
				}
				throw new Error("Erreur lors de la récupération des données");
			}

			const data = await response.json();
			setMesseData(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Une erreur est survenue");
			setMesseData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchMesseData(selectedDate);
	}, [selectedDate, fetchMesseData]);

	const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedDate(event.target.value);
	};

	const handleSuggest = () => {
		if (messeData && allSongs) {
			suggest(messeData, allSongs);
		}
	};

	const handleRegenerate = () => {
		if (messeData && allSongs) {
			regenerate(messeData, allSongs);
		}
	};

	const handleSwapSong = (
		role: SongSuggestion["role"],
		songId: number,
		songTitle: string,
	) => {
		if (!suggestions) return;
		setSuggestions(
			suggestions.map((s) => {
				if (s.role !== role) return s;
				// If swapping with an alternative, move the current song to alternatives
				const currentAsAlt = {
					songId: s.songId,
					songTitle: s.songTitle,
				};
				const newAlternatives = [
					...s.alternatives.filter((a) => a.songId !== songId),
					currentAsAlt,
				];
				return {
					...s,
					songId,
					songTitle: songTitle || `Chant #${songId}`,
					alternatives: newAlternatives,
				};
			}),
		);
	};

	const handleCreateSetlist = async () => {
		if (!suggestions || !messeData) return;
		setCreatingSetlist(true);

		try {
			const formattedDate = new Date(
				messeData.informations.date,
			).toLocaleDateString("fr-FR", {
				day: "numeric",
				month: "long",
				year: "numeric",
			});
			const name = `Messe du ${formattedDate}`;

			const { data: setlist, error: createError } =
				await newNamedSetlistMutation(name);
			if (createError || !setlist) throw new Error("Erreur creation");

			for (let i = 0; i < suggestions.length; i++) {
				await setlistItemAppendMutation(
					i,
					setlist.id,
					suggestions[i].songId,
					null,
				);
			}

			queryClient.invalidateQueries({
				queryKey: queryKeys.setlists.list(),
			});
			navigate(`/setlists/${setlist.id}/edit`);
		} catch {
			setError("Erreur lors de la création de la setlist");
		} finally {
			setCreatingSetlist(false);
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800 min-h-screen">
			<SettingsSidePanel />
			<NavigationSidePanel
				open={isNavigationPanelOpen}
				setOpen={setIsNavigationPanelOpen}
			/>
			<div
				className={clsx(
					"transition-all sticky bg-white dark:bg-gray-800 print:hidden",
					leader ? "top-6" : "top-0",
				)}
			>
				<PageHeader
					variant="list"
					left={
						<div className="flex bg-white rounded-full pl-2 gap-1 items-center">
							<CalendarIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
							<input
								type="date"
								value={selectedDate}
								onChange={handleDateChange}
								className="h-9 rounded-full px-2 outline-hidden bg-white dark:bg-white text-black dark:text-black"
							/>
						</div>
					}
					right={
						<button
							type="button"
							onClick={() => setIsNavigationPanelOpen(true)}
						>
							<img className="h-12" src="/svg/logo.svg" alt="Logo" />
						</button>
					}
				/>
			</div>

			<div className="p-2 md:p-6">
				<h1 className="text-2xl font-bold text-black dark:text-white mb-6">
					Liturgie du jour
				</h1>

				{loading && (
					<div className="text-center py-8">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-jubilateBlue-500" />
						<p className="mt-2 text-gray-600 dark:text-gray-400">
							Chargement...
						</p>
					</div>
				)}

				{error && (
					<div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-sm mb-6">
						{error}
					</div>
				)}

				{messeData && !loading && (
					<div className="space-y-6">
						{/* Informations liturgiques */}
						<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
								Informations liturgiques
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
								<div>
									<span className="font-medium text-gray-700 dark:text-gray-300">
										Date :
									</span>
									<span className="ml-2 text-gray-900 dark:text-gray-100">
										{new Date(messeData.informations.date).toLocaleDateString(
											"fr-FR",
											{
												weekday: "long",
												year: "numeric",
												month: "long",
												day: "numeric",
											},
										)}
									</span>
								</div>
								<div>
									<span className="font-medium text-gray-700 dark:text-gray-300">
										Temps liturgique :
									</span>
									<span className="ml-2 text-gray-900 dark:text-gray-100">
										{messeData.informations.temps_liturgique}
									</span>
								</div>
								<div>
									<span className="font-medium text-gray-700 dark:text-gray-300">
										Couleur :
									</span>
									<span className="ml-2 text-gray-900 dark:text-gray-100">
										{messeData.informations.couleur}
									</span>
								</div>
								{messeData.informations.fete && (
									<div className="col-span-full">
										<span className="font-medium text-gray-700 dark:text-gray-300">
											Fête :
										</span>
										<span className="ml-2 text-gray-900 dark:text-gray-100">
											{messeData.informations.fete}
										</span>
									</div>
								)}
								{messeData.informations.mémoire && (
									<div className="col-span-full">
										<span className="font-medium text-gray-700 dark:text-gray-300">
											Mémoire :
										</span>
										<span className="ml-2 text-gray-900 dark:text-gray-100">
											{messeData.informations.mémoire}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Messes */}
						{messeData.messes.map((messe, messeIndex) => (
							<div key={`messe-${messe.nom}-${messeIndex}`}>
								<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
									{messe.nom}
								</h2>

								<div className="space-y-12">
									{messe.lectures.map((lecture, lectureIndex) => (
										<div
											key={`lecture-${lecture.titre}-${lectureIndex}`}
											className={`border-l-[.3em] rounded-l-sm ${lecture.verset_evangile ? "border-green-600" : "border-jubilateBlue-500"} pl-4`}
										>
											<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
												<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
													{lecture.titre}
												</h3>
												<span className={`text-sm font-medium ${lecture.verset_evangile ? "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900" : "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900"} px-2 py-1 rounded-sm`}>
													{lecture.ref}
												</span>
											</div>

											{lecture.verset_evangile && (
												<div className="mb-3 p-3 bg-green-50 dark:bg-green-900 rounded-sm">
													<div
														className="text-sm italic font-medium text-green-800 dark:text-green-200"
														// biome-ignore lint/security/noDangerouslySetInnerHtml: Gospel verse from trusted AELF API may contain HTML formatting
														dangerouslySetInnerHTML={{
															__html: `Verset de l'Évangile : ${lecture.verset_evangile}`,
														}}
													/>
												</div>
											)}

											{lecture.refrain_psalmique && (
												<div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-sm">
													<div
														className="text-sm font-medium text-blue-800 dark:text-blue-200"
														// biome-ignore lint/security/noDangerouslySetInnerHtml: Psalm refrain from trusted AELF API may contain HTML formatting
														dangerouslySetInnerHTML={{
															__html: `Refrain : ${lecture.refrain_psalmique}`,
														}}
													/>
												</div>
											)}

											{lecture.intro_lue && (
												<div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-sm">
													<p className="text-sm text-gray-700 dark:text-gray-300 italic">
														{lecture.intro_lue}
													</p>
												</div>
											)}

											<div
												className="text-gray-800 dark:text-gray-200 leading-relaxed"
												// biome-ignore lint/security/noDangerouslySetInnerHtml: Liturgical content from trusted AELF API contains necessary HTML formatting
												dangerouslySetInnerHTML={{
													__html: lecture.contenu,
												}}
											/>
										</div>
									))}
								</div>
							</div>
						))}

						{/* Song Suggestions Section */}
						<div className="border-t border-gray-200 dark:border-gray-600 pt-6 pb-20">
							<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
								Suggestions de chants
							</h2>

							{!suggestions && !suggestionsLoading && (
								<button
									type="button"
									onClick={handleSuggest}
									disabled={!allSongs || suggestionsLoading}
									className="flex items-center place-self-center gap-2 px-4 py-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-600 disabled:opacity-50 text-white rounded-lg font-medium"
								>
									<SparklesIcon className="w-5 h-5" />
									Suggérer des chants pour cette messe
								</button>
							)}

							{suggestionsLoading && (
								<div className="text-center py-8">
									<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-jubilateBlue-500" />
									<p className="mt-2 text-gray-600 dark:text-gray-400">
										Analyse liturgique en cours...
									</p>
								</div>
							)}

							{suggestionsError && (
								<div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-sm mb-4">
									{suggestionsError}
								</div>
							)}

							{suggestions && (
								<div className="space-y-4">
									{liturgicalSummary && (
										<p className="text-sm text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700 p-3 rounded-sm">
											{liturgicalSummary}
										</p>
									)}

									<button
										type="button"
										onClick={handleRegenerate}
										disabled={suggestionsLoading}
										className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-jubilateBlue-500 dark:hover:text-jubilateBlue-400 disabled:opacity-50"
									>
										<ArrowPathIcon className="w-4 h-4" />
										Regénérer les suggestions
									</button>

									{suggestions.map((suggestion) => (
										<SuggestionCard
											key={suggestion.role}
											suggestion={suggestion}
											onSwap={(songId, songTitle) =>
												handleSwapSong(suggestion.role, songId, songTitle)
											}
										/>
									))}

									<button
										type="button"
										onClick={handleCreateSetlist}
										disabled={creatingSetlist}
										className="w-full py-3 bg-jubilateGreen-500 hover:bg-jubilateGreen-600 disabled:opacity-50 text-white rounded-lg font-medium"
									>
										{creatingSetlist ? "Création..." : "Créer la setlist"}
									</button>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export { Messe };

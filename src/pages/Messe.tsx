import { PageHeader, SettingsSidePanel, useLeader } from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel";
import { CalendarIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";

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

interface Masse {
	nom: string;
	lectures: Lecture[];
}

interface MesseData {
	informations: LiturgicalInformation;
	messes: Masse[];
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
	const { leader } = useLeader();

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
								className="h-9 rounded-full px-2 outline-none bg-white dark:bg-white text-black dark:text-black"
							/>
						</div>
					}
					right={
						<button type="button" onClick={() => setIsNavigationPanelOpen(true)}>
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
					<div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-6">
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

								<div className="space-y-6">
									{messe.lectures.map((lecture, lectureIndex) => (
										<div
											key={`lecture-${lecture.titre}-${lectureIndex}`}
											className="border-l-4 border-jubilateBlue-500 pl-4"
										>
											<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
												<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
													{lecture.titre}
												</h3>
												<span className="text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded">
													{lecture.ref}
												</span>
											</div>

											{lecture.verset_evangile && (
												<div className="mb-3 p-3 bg-green-50 dark:bg-green-900 rounded">
													<div
														className="text-sm font-medium text-green-800 dark:text-green-200"
														// biome-ignore lint/security/noDangerouslySetInnerHtml: Gospel verse from trusted AELF API may contain HTML formatting
														dangerouslySetInnerHTML={{
															__html: `Verset de l'Évangile : ${lecture.verset_evangile}`,
														}}
													/>
												</div>
											)}

											{lecture.refrain_psalmique && (
												<div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900 rounded">
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
												<div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
													<p className="text-sm text-gray-700 dark:text-gray-300 italic">
														{lecture.intro_lue}
													</p>
												</div>
											)}

											<div
												className="text-gray-800 dark:text-gray-200 leading-relaxed"
												// biome-ignore lint/security/noDangerouslySetInnerHtml: Liturgical content from trusted AELF API contains necessary HTML formatting
												dangerouslySetInnerHTML={{ __html: lecture.contenu }}
											/>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export { Messe };

import { PageHeader } from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel";
import { getPopularSongsQuery } from "@/utils/supabase";
import * as Sentry from "@sentry/react";
import { useEffect, useState } from "react";

function Analytics() {
	// Component purely vibe coded, no guarantee
	const [analytics, setAnalytics] = useState<
		{ title: string; count: number }[]
	>([]);
	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchAnalytics = async () => {
			setIsLoading(true);
			try {
				const { data, error } = await getPopularSongsQuery(
					startDate || undefined,
					endDate || undefined,
				);

				if (error) {
					Sentry.captureException(error);
					console.error("Erreur lors du chargement des analytics:", error);
				} else if (data) {
					setAnalytics(data);
				}
			} catch (error) {
				Sentry.captureException(error);
				console.error("Erreur lors du chargement des analytics:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAnalytics();
	}, [startDate, endDate]);

	// Data is now pre-aggregated from the query
	const songCounts = analytics;

	const handleDateChange = (type: "start" | "end", value: string) => {
		if (type === "start") {
			setStartDate(value);
		} else {
			setEndDate(value);
		}
	};

	const clearFilters = () => {
		setStartDate("");
		setEndDate("");
	};

	const setTimeRange = (range: "week" | "3months" | "year") => {
		const now = new Date();
		const end = now.toISOString().split("T")[0];

		const start = new Date();

		switch (range) {
			case "week":
				start.setDate(now.getDate() - 7);
				break;
			case "3months":
				start.setMonth(now.getMonth() - 3);
				break;
			case "year":
				start.setFullYear(now.getFullYear() - 1);
				break;
		}

		setStartDate(start.toISOString().split("T")[0]);
		setEndDate(end);
	};

	return (
		<div className="min-h-screen bg-white dark:bg-gray-800">
			<PageHeader
				variant="list"
				title="Statistiques"
				right={
					<button type="button" onClick={() => setIsNavigationPanelOpen(true)}>
						<img className="h-12" src="/svg/logo.svg" alt="Logo" />
					</button>
				}
			/>

			<div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
				<div className="flex flex-col gap-3 sm:gap-4">
					<div className="flex flex-wrap gap-2 items-center">
						<button
							type="button"
							onClick={() => setTimeRange("week")}
							className="px-3 py-2 bg-jubilateBlue-100 dark:bg-jubilateBlue-900 text-jubilateBlue-700 dark:text-jubilateBlue-300 rounded-md hover:bg-jubilateBlue-200 dark:hover:bg-jubilateBlue-800 transition-colors text-sm font-medium"
						>
							Dernière semaine
						</button>
						<button
							type="button"
							onClick={() => setTimeRange("3months")}
							className="px-3 py-2 bg-jubilateBlue-100 dark:bg-jubilateBlue-900 text-jubilateBlue-700 dark:text-jubilateBlue-300 rounded-md hover:bg-jubilateBlue-200 dark:hover:bg-jubilateBlue-800 transition-colors text-sm font-medium"
						>
							3 derniers mois
						</button>
						<button
							type="button"
							onClick={() => setTimeRange("year")}
							className="px-3 py-2 bg-jubilateBlue-100 dark:bg-jubilateBlue-900 text-jubilateBlue-700 dark:text-jubilateBlue-300 rounded-md hover:bg-jubilateBlue-200 dark:hover:bg-jubilateBlue-800 transition-colors text-sm font-medium"
						>
							Dernière année
						</button>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
						<div>
							<label
								htmlFor="startDate"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
							>
								Date de début
							</label>
							<input
								type="date"
								id="startDate"
								value={startDate}
								onChange={(e) => handleDateChange("start", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-jubilateBlue-500 focus:border-jubilateBlue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
							/>
						</div>
						<div>
							<label
								htmlFor="endDate"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
							>
								Date de fin
							</label>
							<input
								type="date"
								id="endDate"
								value={endDate}
								onChange={(e) => handleDateChange("end", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-jubilateBlue-500 focus:border-jubilateBlue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
							/>
						</div>
					</div>
					<button
						type="button"
						onClick={clearFilters}
						className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
					>
						Effacer les filtres
					</button>
				</div>
			</div>

			<div className="p-3 sm:p-4">
				{isLoading ? (
					<div className="flex justify-center items-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jubilateBlue-500" />
					</div>
				) : songCounts.length === 0 ? (
					<div className="text-center py-8 text-gray-500 dark:text-gray-400">
						Aucune donnée trouvée pour cette période
					</div>
				) : (
					<div className="space-y-2 sm:space-y-3">
						<h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
							Chansons les plus populaires
						</h2>
						<div className="space-y-2 sm:space-y-3">
							{songCounts.map((song, index) => (
								<div
									key={song.title}
									className="bg-white dark:bg-gray-700 rounded-lg shadow-xs border border-gray-200 dark:border-gray-600 p-3 sm:p-4"
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
											<div className="w-6 h-6 sm:w-8 sm:h-8 bg-jubilateBlue-500 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
												{index + 1}
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
													{song.title}
												</h3>
												<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
													{song.count} vue{song.count > 1 ? "s" : ""}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<div className="w-16 sm:w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
												<div
													className="bg-jubilateBlue-500 h-2 rounded-full transition-all duration-300"
													style={{
														width: `${
															(song.count /
																Math.max(...songCounts.map((s) => s.count))) *
															100
														}%`,
													}}
												/>
											</div>
											<span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 min-w-8 sm:min-w-12 text-right">
												{song.count}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			<NavigationSidePanel
				open={isNavigationPanelOpen}
				setOpen={setIsNavigationPanelOpen}
			/>
		</div>
	);
}

export default Analytics;

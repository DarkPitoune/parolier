import {
	DynamicText,
	addChorusAtom,
	fontSizeAtom,
	showChordsAtom,
	themeModeAtom,
} from "@/components";
import { leaderAtom, useLeader } from "@/components/Contexts/LeaderContext";
import type { ThemeMode } from "@/components/Contexts/SettingsContext";
import {
	globalSearchEnabledAtom,
	tonalityAtom,
} from "@/components/Contexts/SettingsContext";
import {
	CONTENT_TYPE_ICONS,
	navigationHistoryAtom,
} from "@/hooks/useNavigationHistory";
import { queryKeys } from "@/utils/queryKeys";
import {
	type LeaderPositions,
	getLeaderPositionsQuery,
	newSongMutation,
} from "@/utils/supabase";
import {
	BeakerIcon,
	BookOpenIcon,
	CalendarDaysIcon,
	ChartBarIcon,
	DocumentTextIcon,
	FireIcon,
	MinusIcon,
	MusicalNoteIcon,
	PlusIcon,
	PresentationChartLineIcon,
	QueueListIcon,
	RectangleGroupIcon,
} from "@heroicons/react/16/solid";
import {
	ComputerDesktopIcon,
	MoonIcon,
	SunIcon,
} from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DropLeadButton, TakeLeadButton } from "../../Contexts/LeaderButtons";
import { SidePanel } from "../SidePanel";
import { ResetIcon } from "./SettingsSidePanel/ResetIcon";

const usernameAtom = atomWithStorage<string>(
	"username",
	"",
	createJSONStorage(() => localStorage),
);

type TabId = "navigation" | "settings";

function GlobalSidePanel({
	open,
	onClose,
}: { open: boolean; onClose: () => void }) {
	const [activeTab, setActiveTab] = useState<TabId>("navigation");
	const location = useLocation();
	const prevPathname = useRef(location.pathname);

	// Auto-close on route change (skip initial render)
	// biome-ignore lint/correctness/useExhaustiveDependencies: close panel when pathname changes
	useEffect(() => {
		if (prevPathname.current !== location.pathname) {
			prevPathname.current = location.pathname;
			onClose();
		}
	}, [location.pathname, onClose]);

	const header = (
		<div className="flex gap-2 p-1 rounded-full bg-slate-300 dark:bg-slate-700">
			{(
				[
					{ value: "navigation", label: "Navigation" },
					{ value: "settings", label: "Préférences" },
				] as const
			).map(({ value, label }) => (
				<button
					key={value}
					type="button"
					onClick={() => setActiveTab(value)}
					className={clsx(
						"flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors flex-1 justify-center font-flame text-lg",
						activeTab === value
							? "bg-white dark:bg-slate-800 text-jubilateBlue-500 dark:text-jubilateBlue-400"
							: "bg-transparent text-gray-600 dark:text-gray-400",
					)}
				>
					{label}
				</button>
			))}
		</div>
	);

	return (
		<SidePanel open={open} onClose={onClose} header={header}>
			{activeTab === "navigation" ? (
				<NavigationContent onClose={onClose} />
			) : (
				<SettingsContent />
			)}
		</SidePanel>
	);
}

function NavigationContent({ onClose }: { onClose: () => void }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const history = useAtomValue(navigationHistoryAtom);

	const createNewSong = async () => {
		const title = prompt("Titre de la chanson");
		if (!title) return;
		const { error, data } = await newSongMutation(title);
		if (error) {
			toast.error(`Erreur lors de la création de la chanson: ${error.message}`);
		} else {
			queryClient.invalidateQueries({ queryKey: queryKeys.songs.list() });
			toast.success("Chanson créée avec succès");
			navigate(`/songs/${data.id}`);
		}
	};

	return (
		<>
			<div className="flex flex-col gap-1">
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/"
				>
					<MusicalNoteIcon className="w-4 h-4" />
					Liste des chants
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/refrains"
				>
					<FireIcon className="w-4 h-4" />
					Refrains
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/ordinaires"
				>
					<RectangleGroupIcon className="w-4 h-4" />
					Ordinaires de messe
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/texts"
				>
					<DocumentTextIcon className="w-4 h-4" />
					Textes
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/bible"
				>
					<BookOpenIcon className="w-4 h-4" />
					Bible
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/messe"
				>
					<CalendarDaysIcon className="w-4 h-4" />
					Messe
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/setlists"
				>
					<QueueListIcon className="w-4 h-4" />
					Setlists
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/analytics"
				>
					<ChartBarIcon className="w-4 h-4" />
					Statistiques
				</Link>
				<Link
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					to="/presenter"
				>
					<PresentationChartLineIcon className="w-4 h-4" />
					Mode Présentateur
				</Link>
				<button
					className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
					type="button"
					onClick={createNewSong}
				>
					<PlusIcon className="w-4 h-4" />
					Nouvelle chanson
				</button>
			</div>
			{history.length > 0 && (
				<>
					<hr className="border-gray-200 dark:border-gray-600 my-2" />
					<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-1 uppercase tracking-wide">
						Récents
					</h3>
					<div className="flex flex-col border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mx-1">
						{history.map((entry) => {
							const Icon = CONTENT_TYPE_ICONS[entry.type];
							return (
								<button
									key={entry.path}
									type="button"
									onClick={() => {
										navigate(entry.path, {
											state: { restoreScrollY: entry.scrollY },
										});
										onClose();
									}}
									className="flex items-center gap-2 px-3 py-1.5 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition text-left w-full min-w-0"
								>
									<Icon className="w-4 h-4 shrink-0" />
									<span className="truncate">{entry.title}</span>
								</button>
							);
						})}
					</div>
				</>
			)}
		</>
	);
}

function SettingsContent() {
	const setFontSize = useSetAtom(fontSizeAtom);
	const [themeMode, setThemeMode] = useAtom(themeModeAtom);
	const [showChords, setShowChords] = useAtom(showChordsAtom);
	const [globalSearchEnabled, setGlobalSearchEnabled] = useAtom(
		globalSearchEnabledAtom,
	);
	const [isLeaderPanelOpen, setIsLeaderPanelOpenInternal] = useState(true);
	const [addChorus, setAddChorus] = useAtom(addChorusAtom);
	const [tonality, setTonality] = useAtom(tonalityAtom);
	const [username, setUsername] = useAtom(usernameAtom);
	const [leader, setLeader] = useAtom(leaderAtom);
	const [leaderList, setLeaderList] = useState<LeaderPositions>([]);
	const navigate = useNavigate();

	const { takeLead } = useLeader();

	const updateLeaderList = async () => {
		getLeaderPositionsQuery().then(({ data }) => {
			if (data) setLeaderList(data);
		});
	};

	function handleFontChange(increment: number) {
		setFontSize((fontSize) => {
			if (increment === 0) return 2;
			if (fontSize + increment < 0) return 0;
			if (fontSize + increment > 9) return 9;
			return fontSize + increment;
		});
	}

	const setIsLeaderPanelOpen = (isLeader: boolean) => {
		setIsLeaderPanelOpenInternal(isLeader);
		if (!isLeader) updateLeaderList();
	};

	return (
		<>
			<div className="flex flex-col gap-2" aria-label="font size choice">
				<div className="flex justify-between">
					<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
						Police
					</h1>
					<div className="flex gap-4">
						<button onClick={() => handleFontChange(-1)} type="button">
							<MinusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
						<button onClick={() => handleFontChange(1)} type="button">
							<PlusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
						<button onClick={() => handleFontChange(0)} type="button">
							<ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
					</div>
				</div>
				<DynamicText
					text="Amen de gloire"
					className="dark:text-white text-center"
				/>
			</div>

			<div className="flex flex-col gap-2" aria-label="theme choice">
				<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
					Thème
				</h1>
				<div className="flex gap-2 p-1 rounded-full bg-slate-300 dark:bg-slate-700">
					{(
						[
							{ value: "system", label: "Système", Icon: ComputerDesktopIcon },
							{ value: "light", label: "Clair", Icon: SunIcon },
							{ value: "dark", label: "Sombre", Icon: MoonIcon },
						] as const
					).map(({ value, label, Icon }) => (
						<button
							key={value}
							type="button"
							onClick={() => setThemeMode(value as ThemeMode)}
							className={clsx(
								"flex items-center gap-1 rounded-full px-3 py-1 transition-colors flex-1 justify-center",
								themeMode === value
									? "bg-white dark:bg-slate-800"
									: "bg-transparent",
							)}
						>
							<Icon className="size-4" />
							<span className="text-sm hidden md:block">{label}</span>
						</button>
					))}
				</div>
			</div>

			<div className="flex justify-between gap-4" aria-label="chords choice">
				<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
					Accords
				</h1>

				<input
					id="chordsCheckbox"
					type="checkbox"
					checked={showChords}
					onChange={(e) => {
						setShowChords(e.target.checked);
					}}
					className="w-5 h-5 accent-jubilateBlue-500 dark:accent-jubilateBlue-400 rounded-2xl"
				/>
			</div>

			<div className="flex flex-col gap-2" aria-label="tonality choice">
				<div className="flex justify-between">
					<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
						Transposer
					</h1>
					<div className="flex gap-4">
						<button onClick={() => setTonality(tonality - 1)} type="button">
							<MinusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
						<button onClick={() => setTonality(tonality + 1)} type="button">
							<PlusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
						<button
							onClick={() => {
								setTonality(0);
							}}
							type="button"
						>
							<ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
					</div>
				</div>
				<DynamicText
					text={tonality.toString()}
					className="dark:text-white text-black text-center"
				/>
			</div>

			<div
				className="flex items-center justify-between gap-4"
				aria-label="chorus choice"
			>
				<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
					Refrains
				</h1>

				<input
					id="chorusCheckbox"
					type="checkbox"
					checked={addChorus}
					onChange={(e) => {
						setAddChorus(e.target.checked);
					}}
					className="size-5 rounded-2xl accent-jubilateBlue-500 dark:accent-jubilateBlue-400"
				/>
			</div>

			<div className="flex flex-col gap-4 border border-jubilateBlue-300 bg-jubilateBlue-300/30 px-4 py-2 rounded-md items-center">
				<h2 className="text-center font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400 text-2xl">
					Leader de chant
				</h2>
				{leader ? (
					<>
						<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 text-sm md:text-base">
							{leader.leading
								? `Vous (${leader.id}) partagez votre chant`
								: `Vous suivez ${leader.id}`}
						</p>
						<button
							type="button"
							onClick={() => setLeader(null)}
							className="flex md:gap-4 gap-2 items-center"
						>
							<p className="text-jubilateRed text-sm md:text-base">Stopper</p>
							<DropLeadButton />
						</button>
					</>
				) : (
					<>
						<div className="flex gap-2 w-fit p-1 rounded-full bg-slate-300 dark:bg-slate-700">
							<button
								type="button"
								onClick={() => setIsLeaderPanelOpen(true)}
								className={clsx([
									"rounded-full px-2 transition-colors",
									isLeaderPanelOpen
										? "bg-white dark:bg-slate-800"
										: "bg-transparent",
								])}
							>
								Diriger
							</button>
							<button
								type="button"
								onClick={() => setIsLeaderPanelOpen(false)}
								className={clsx([
									"rounded-full px-2 py-1 transition-colors",
									!isLeaderPanelOpen
										? "bg-white dark:bg-slate-800"
										: "bg-transparent",
								])}
							>
								Suivre
							</button>
						</div>
						{!leader && isLeaderPanelOpen ? (
							<form
								className="flex flex-col gap-4 items-center"
								onSubmit={(e) => {
									e.preventDefault();
									takeLead(username);
								}}
							>
								<div className="flex md:gap-4 gap-2 items-baseline justify-between">
									<h1 className="font-flame text-xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
										Pseudo
									</h1>
									<input
										id="username"
										type="text"
										onChange={(e) => {
											setUsername(e.target.value);
										}}
										value={username}
										className="rounded-2xl px-4 py-1 mr-4 text-black dark:text-white outline-solid outline-jubilateBlue-300 focus:outline-jubilateBlue-500 dark:accent-jubilateBlue-400 w-full dark:bg-slate-700 bg-jubilateBlue-100"
									/>
								</div>
								<button
									type="submit"
									className="flex md:gap-4 gap-2 items-center"
								>
									<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 text-sm md:text-base">
										Partager
									</p>
									<TakeLeadButton />
								</button>
							</form>
						) : (
							<>
								<div className="flex gap-4 flex-col w-full justify-center">
									<div className="flex items-center justify-between">
										<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 font-flame">
											Leaders disponibles
										</p>
										<button type="button" onClick={updateLeaderList}>
											<ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
										</button>
									</div>
									<div className="bg-slate-300 dark:bg-slate-700 rounded-lg flex flex-col items-stretch">
										{leaderList.map((leader) => (
											<button
												key={leader.leader_id}
												type="button"
												className="text-jubilateBlue-500 dark:text-jubilateBlue-400 font-flame"
												onClick={() => {
													setLeader({ id: leader.leader_id, leading: false });
													if (leader.song !== null)
														navigate(`/songs/${leader.song}`);
												}}
											>
												{leader.leader_id}
											</button>
										))}
									</div>
								</div>
							</>
						)}
					</>
				)}
			</div>

			<div
				className="flex justify-between gap-4 items-center"
				aria-label="global search choice"
			>
				<div className="flex items-center gap-2">
					<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
						Recherche globale
					</h1>
					<BeakerIcon
						className="w-5 fill-jubilateBlue-500 dark:fill-jubilateBlue-400"
						aria-label="Fonctionnalité expérimentale"
					/>
				</div>

				<input
					id="globalSearchCheckbox"
					type="checkbox"
					checked={globalSearchEnabled}
					onChange={(e) => {
						setGlobalSearchEnabled(e.target.checked);
					}}
					className="w-5 h-5 accent-jubilateBlue-500 dark:accent-jubilateBlue-400 rounded-2xl"
				/>
			</div>
		</>
	);
}

export { GlobalSidePanel };

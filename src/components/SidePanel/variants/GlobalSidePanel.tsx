import {
	addChorusAtom,
	fontSizeAtom,
	showChordsAtom,
	themeModeAtom,
} from "@/components";
import {
	FONT_SIZES,
	type FontSize,
	type ThemeMode,
	showPerformanceNotesAtom,
	tonalityAtom,
} from "@/components/Contexts/SettingsContext";
import { queryKeys } from "@/utils/queryKeys";
import { newSongMutation } from "@/utils/supabase";
import { startTunerCapture } from "@/utils/tunerAudio";
import {
	BookOpenIcon,
	CalendarDaysIcon,
	ChartBarIcon,
	DocumentTextIcon,
	FireIcon,
	MusicalNoteIcon,
	PlusIcon,
	PresentationChartLineIcon,
	QueueListIcon,
	RectangleGroupIcon,
	SpeakerWaveIcon,
} from "@heroicons/react/16/solid";
import {
	ArrowPathIcon,
	ComputerDesktopIcon,
	MoonIcon,
	SunIcon,
} from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SidePanel } from "../SidePanel";
import { LeaderSetting } from "./SettingsSidePanel/LeaderSetting";
import {
	type SegmentedOption,
	SettingRow,
	SettingSegmented,
	SettingStepper,
	SettingToggle,
	SettingsSection,
} from "./SettingsSidePanel/SettingsControls";

type TabId = "navigation" | "settings";

function GlobalSidePanel({
	open,
	onClose,
}: { open: boolean; onClose: () => void }) {
	const [activeTab, setActiveTab] = useState<TabId>("navigation");
	const location = useLocation();
	const prevPathname = useRef(location.pathname);

	// Auto-close on route change (skip initial render)
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
			{activeTab === "navigation" ? <NavigationContent /> : <SettingsContent />}
		</SidePanel>
	);
}

function NavigationContent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

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
				to="/setlists"
			>
				<QueueListIcon className="w-4 h-4" />
				Setlists
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
				to="/tuner"
				onClick={() => startTunerCapture()}
			>
				<SpeakerWaveIcon className="w-4 h-4" />
				Accordeur
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
	);
}

const THEME_MODES: SegmentedOption<ThemeMode>[] = [
	{
		value: "system",
		label: "Système",
		icon: <ComputerDesktopIcon className="size-4" />,
	},
	{ value: "light", label: "Clair", icon: <SunIcon className="size-4" /> },
	{ value: "dark", label: "Sombre", icon: <MoonIcon className="size-4" /> },
];

// The glyph is the control: a letter drawn at the size it selects needs no label.
const sizeGlyph = (scale: string) => (
	<span className={clsx("w-6 text-center font-flame leading-none", scale)}>
		A
	</span>
);

const FONT_SIZE_OPTIONS: SegmentedOption<FontSize>[] = [
	{ value: FONT_SIZES[0], label: "Normal", icon: sizeGlyph("text-sm") },
	{ value: FONT_SIZES[1], label: "Grand", icon: sizeGlyph("text-lg") },
	{ value: FONT_SIZES[2], label: "Très grand", icon: sizeGlyph("text-2xl") },
];

function SettingsContent() {
	const [fontSize, setFontSize] = useAtom(fontSizeAtom);
	const [themeMode, setThemeMode] = useAtom(themeModeAtom);
	const [showChords, setShowChords] = useAtom(showChordsAtom);
	const [addChorus, setAddChorus] = useAtom(addChorusAtom);
	const [showPerformanceNotes, setShowPerformanceNotes] = useAtom(
		showPerformanceNotesAtom,
	);
	const [tonality, setTonality] = useAtom(tonalityAtom);
	const [refreshing, setRefreshing] = useState(false);

	const refreshApp = async () => {
		setRefreshing(true);
		try {
			if ("serviceWorker" in navigator) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				await Promise.all(registrations.map((r) => r.unregister()));
			}
			if ("caches" in window) {
				const keys = await caches.keys();
				await Promise.all(keys.map((key) => caches.delete(key)));
			}
		} finally {
			window.location.reload();
		}
	};

	return (
		<>
			<div className="flex flex-col gap-4">
				<SettingsSection label="Partition">
					<SettingRow ariaLabel="chords choice" name="Accords">
						<SettingToggle
							label="Accords"
							checked={showChords}
							onChange={setShowChords}
						/>
					</SettingRow>
					{/* Transposing while the chords are hidden changes nothing on
					    screen, so the row leaves rather than sitting there inert. */}
					{showChords && (
						<SettingRow ariaLabel="tonality choice" name="Transposition" nested>
							<SettingStepper
								label="Transposition"
								value={tonality > 0 ? `+${tonality}` : String(tonality)}
								active={tonality !== 0}
								onStep={(increment) => setTonality(tonality + increment)}
								onReset={() => setTonality(0)}
							/>
						</SettingRow>
					)}
					<SettingRow ariaLabel="chorus choice" name="Répéter les refrains">
						<SettingToggle
							label="Répéter les refrains"
							checked={addChorus}
							onChange={setAddChorus}
						/>
					</SettingRow>
					<SettingRow ariaLabel="performance notes choice" name="Notes de jeu">
						<SettingToggle
							label="Notes de jeu"
							checked={showPerformanceNotes}
							onChange={setShowPerformanceNotes}
						/>
					</SettingRow>
				</SettingsSection>

				<SettingsSection label="Lecture">
					<SettingRow ariaLabel="font size choice" name="Taille du texte">
						<SettingSegmented
							value={fontSize}
							options={FONT_SIZE_OPTIONS}
							onChange={setFontSize}
						/>
					</SettingRow>
					<SettingRow ariaLabel="theme choice" name="Thème">
						<SettingSegmented
							value={themeMode}
							options={THEME_MODES}
							onChange={setThemeMode}
							withLabels
						/>
					</SettingRow>
				</SettingsSection>

				<SettingsSection label="En groupe">
					<LeaderSetting />
				</SettingsSection>
			</div>

			<div className="h-10 shrink-0" />

			<button
				type="button"
				onClick={refreshApp}
				disabled={refreshing}
				aria-label="Rafraîchir l'app"
				title="Rafraîchir l'app"
				className="absolute bottom-6 right-4 sm:right-6 p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-jubilateBlue-500 dark:hover:text-jubilateBlue-400 transition disabled:opacity-50"
			>
				<ArrowPathIcon
					className={clsx("w-4 h-4", refreshing && "animate-spin")}
				/>
			</button>
		</>
	);
}

export { GlobalSidePanel };

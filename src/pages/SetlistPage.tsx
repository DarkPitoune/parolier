import { BackButton, DynamicText, SongViewer } from "@/components";
import { tonalityAtom } from "@/components/Contexts/SettingsContext";
import SwipeableTabs, { type Tab } from "@/components/SwipeableTabs";
import { useSetlist } from "@/hooks/queries/useSetlistQueries";
import {
	ComputerDesktopIcon,
	PresentationChartLineIcon,
} from "@heroicons/react/24/solid";
import { useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

function SetlistPage() {
	const { setlistId } = useParams();

	const { data: setlistData } = useSetlist(setlistId);
	const setlist = useMemo(
		() =>
			setlistData
				? [...setlistData].sort((a, b) => a.position - b.position)
				: null,
		[setlistData],
	);

	const [activeTab, setActiveTab] = useState(0);
	const setTonality = useSetAtom(tonalityAtom);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset tonality when switching tabs
	useEffect(() => {
		setTonality(0);
	}, [activeTab, setTonality]);

	const handleChangeTab = (index: number) => {
		setActiveTab(index);
	};

	const tabs: Tab[] = (setlist ?? [])
		.map((item) => {
			if (item.songs)
				return {
					id: item.id,
					title: item.songs.title,
					content: (
						<div className="flex flex-col gap-4">
							<SongViewer showTitle song={item.songs} />
						</div>
					),
				};
			if (item.texts)
				return {
					id: item.id,
					title: item.texts.title,
					content: (
						<div className="flex flex-col gap-4 p-6">
							<h2 className="text-2xl font-bold text-black dark:text-white">
								{item.texts.title}
							</h2>
							<div className="whitespace-pre-wrap text-black dark:text-white leading-relaxed">
								{item.texts.content}
							</div>
						</div>
					),
				};
			if (item.text)
				return {
					id: item.id,
					title: item.text.split(" ")[0],
					content: (
						<div className="flex flex-col gap-4 p-4">
							<DynamicText
								className="whitespace-pre-wrap text-black dark:text-white"
								text={item.text}
							/>
						</div>
					),
				};
			return null;
		})
		.filter((v) => v !== null);

	return (
		<div>
			<div className="flex justify-between items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky bg-white dark:bg-gray-900">
				<BackButton />
				<h3 className="text-xl lg:text-3xl font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400">
					{setlist ? setlist[0]?.setlists?.name : "Chargement..."}
				</h3>
				<div className="flex items-center gap-2">
					<Link
						className="rounded-full hidden md:block bg-green-500 hover:bg-green-600 text-white p-3"
						to={`/presenter/${setlistId}/${activeTab + 1}`}
					>
						<PresentationChartLineIcon className="size-6 fill-white" />
					</Link>
					<Link
						className="rounded-full hidden md:block bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white p-3"
						onClick={() => document.body.requestFullscreen()}
						to={`/setlists/${setlistId}/steps/${activeTab + 1}/slide`}
					>
						<ComputerDesktopIcon className="size-6 fill-white" />
					</Link>
				</div>
			</div>
			{setlist && (
				<SwipeableTabs
					activeTab={activeTab}
					setActiveTab={handleChangeTab}
					tabs={tabs}
				/>
			)}
		</div>
	);
}

export { SetlistPage };

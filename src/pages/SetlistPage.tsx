import { BackButton, DynamicText, SongViewer } from "@/components";
import SwipeableTabs, { type Tab } from "@/components/SwipeableTabs";
import { type Setlist, setlistQuery } from "@/utils/supabase";
import { ComputerDesktopIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function SetlistPage() {
	const { setlistId } = useParams();

	const [setlist, setSetlist] = useState<Setlist | null>(null);

	const [activeTab, setActiveTab] = useState(0);

	const handleChangeTab = (index: number) => {
		setActiveTab(index);
	};

	useEffect(() => {
		if (setlistId)
			setlistQuery(setlistId).then(({ data }) => {
				if (data) data.sort((a, b) => a.position - b.position);
				setSetlist(data);
			});
		// evenuellement remettre les analytics
	}, [setlistId]);

	const tabs: Tab[] = (setlist ?? [])
		.map((item) => {
			if (item.songs)
				return {
					id: item.id,
					title: item.songs.title,
					content: (
						<div className="flex flex-col gap-4">
							<SongViewer song={item.songs} />
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
					{setlist ? setlist[0]?.setlists?.name : "Loading..."}
				</h3>
				<div className="flex items-center gap-4">
					<Link
						className="rounded-full hidden md:block bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white p-3"
						onClick={() => document.body.requestFullscreen()}
						to={`/setlists/${setlistId}/steps/${activeTab}/slide`}
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

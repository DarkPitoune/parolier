import { SongViewer } from "@/components";
import { type Setlist, setlistQuery } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SwipeableTabs from "@/components/SwipeableTabs";
import { ChevronLeftIcon } from "@heroicons/react/16/solid";
import { ComputerDesktopIcon } from "@heroicons/react/24/solid";

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

	return (
		<div>
			<div className="flex justify-between items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky bg-white dark:bg-gray-900">
				<Link
					className="bg-jubilateBlue-500 dark:bg-jubilateBlue-400 rounded-full hover:bg-jubilateBlue-700"
					to="/"
				>
					<ChevronLeftIcon className="w-10 dark:fill-gray-800 fill-white" />
				</Link>

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
					tabs={setlist.map((item) => ({
						id: item.id,
						title: item.songs.title,
						content: (
							<div className="flex flex-col gap-4">
								<SongViewer song={item.songs} />
							</div>
						),
					}))}
				/>
			)}
		</div>
	);
}

export { SetlistPage };

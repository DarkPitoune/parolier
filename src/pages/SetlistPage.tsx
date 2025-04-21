import { SongViewer } from "@/components";
import { type Setlist, setlistQuery } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SwipeableTabs from "@/components/SwipeableTabs";

function SetlistPage() {
	const { setlistId } = useParams();

	const [setlist, setSetlist] = useState<Setlist | null>(null);

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
			{setlist && (
				<SwipeableTabs
					tabs={setlist.map((item) => ({
						id: item.id,
						title: item.songs.title,
						content: (
							<div className="flex flex-col gap-4">
								<SongViewer song={item.songs} showTopBar={false} />
							</div>
						),
					}))}
				/>
			)}
		</div>
	);
}

export { SetlistPage };

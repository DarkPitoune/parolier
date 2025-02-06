import supabase, {
	type AllSetlists,
	allSetlistsQuery,
	type Setlist,
	setlistQuery,
} from "@/utils/supabase";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const Setlists = () => {
	const { setlistId } = useParams();

	const [setslists, setSetlists] = useState<AllSetlists>([]);
	const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);

	const updateSelectedSetlist = useCallback(
		() =>
			setlistId
				? setlistQuery(setlistId).then(({ data }) => setSelectedSetlist(data))
				: null,
		[setlistId],
	);

	useEffect(() => {
		allSetlistsQuery().then(({ data }) => setSetlists(data || []));

		if (setlistId) updateSelectedSetlist();
	}, [setlistId, updateSelectedSetlist]);

	const addSong = () => {
		setlistId
			? supabase
					.from("setlist_items")
					.insert({
						setlist_id: Number(setlistId),
						position: selectedSetlist?.length,
						song_id: 1,
					})
					.then(updateSelectedSetlist)
			: null;
	};

	return (
		<div
			className={clsx(
				"grid w-screen h-screen",
				setlistId ? "grid-cols-2" : "grid-cols-1",
			)}
		>
			<div>
				{setslists?.map((setlist) => (
					<div key={setlist.id} className="p-4 bg-gray-100 dark:bg-gray-800">
						<Link to={`/setlists/${setlist.id}`} className="text-xl font-bold">
							{setlist.name}
						</Link>
					</div>
				))}
			</div>
			{setlistId && (
				<div className="shadow-2xl p-4">
					{selectedSetlist?.map((item) => (
						<div key={item.id}>
							{item.songs ? item.songs.title : item.texts?.title}
						</div>
					))}
					<button type="button" onClick={addSong}>
						Ajouter nouveau morceau
					</button>
				</div>
			)}
		</div>
	);
};

export { Setlists };

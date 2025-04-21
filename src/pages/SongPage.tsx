import { SongViewer, useLeader } from "@/components";
import {
	type TaggedSong,
	analyticsSong,
	taggedSongFromSetlistStepQuery,
	taggedSongQuery,
} from "@/utils/supabase";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function SongPage() {
	const { songId, stepNumber, setlistId } = useParams();
	const [song, setSong] = useState<TaggedSong>();
	const { setLeaderSong } = useLeader();

	// biome-ignore lint/correctness/useExhaustiveDependencies: adding setLeader spams BE
	useEffect(() => {
		if (songId)
			// showing the page from a regular song page
			taggedSongQuery(Number(songId)).then(({ data }) => {
				if (data) setSong(data);
			});
		if (setlistId && stepNumber)
			// showing the page in the context of a set
			taggedSongFromSetlistStepQuery(setlistId, Number(stepNumber)).then(
				({ data }) => {
					if (data?.songs) setSong(data.songs);
				},
			);
		setLeaderSong(Number(songId));
		let timeout: NodeJS.Timeout;
		if (songId && import.meta.env.MODE === "production")
			timeout = setTimeout(() => {
				analyticsSong(Number(songId));
			}, 30_000);
		return () => clearTimeout(timeout);
	}, [songId, setlistId, stepNumber]);

	if (!song) return null;

	if (setlistId && stepNumber) return <div></div>;

	return <SongViewer song={song} />;
}

export { SongPage };

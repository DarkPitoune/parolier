import { updateLeaderPositionMutation } from "@/utils/supabase";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useMatch } from "react-router-dom";

type Leader = {
	id: string;
	leading: boolean;
	since: number;
};

// Kept in localStorage so a phone that kills the app in the background is
// still leading or following when reopened, but forgotten after a service's
// worth of time so nobody wakes up still following last week's leader.
const LEADER_TTL_MS = 6 * 60 * 60 * 1000;

const leaderStorage = createJSONStorage<Leader | null>(() => localStorage);

export const leaderAtom = atomWithStorage<Leader | null>(
	"leader",
	null,
	{
		...leaderStorage,
		getItem: (key, initialValue) => {
			const stored = leaderStorage.getItem(key, initialValue);
			if (!stored || Date.now() - stored.since > LEADER_TTL_MS)
				return initialValue;
			return stored;
		},
	},
	{ getOnInit: true },
);

const useLeader = () => {
	const [leader, setLeader] = useAtom(leaderAtom);
	const match = useMatch("/songs/:id");
	const songId = match?.params.id;

	const takeLead = (id: string) => {
		setLeader({
			id,
			leading: true,
			since: Date.now(),
		});
		updateLeaderPositionMutation({
			leaderId: id,
			...(songId ? { leaderSongId: Number(songId) } : {}),
		});
	};

	const follow = (id: string) => {
		setLeader({ id, leading: false, since: Date.now() });
	};

	const setLeaderSong = async (song: number) => {
		if (leader?.leading) {
			await updateLeaderPositionMutation({
				leaderId: leader.id,
				leaderSongId: song,
			});
		}
	};

	return {
		leader,
		takeLead,
		follow,
		setLeaderSong,
	};
};

export { useLeader };

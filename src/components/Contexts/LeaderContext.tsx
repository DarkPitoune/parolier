import { updateLeaderPositionMutation } from "@/utils/supabase";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useMatch } from "react-router-dom";

type Leader = {
	id: string;
	leading: boolean;
};

export const leaderAtom = atomWithStorage<Leader | null>(
	"leader",
	null,
	createJSONStorage(() => sessionStorage),
);

const useLeader = () => {
	const [leader, setLeader] = useAtom(leaderAtom);
	const match = useMatch("/songs/:id");
	const songId = match?.params.id;

	const takeLead = (id: string) => {
		setLeader({
			id,
			leading: true,
		});
		updateLeaderPositionMutation({
			leaderId: id,
			...(songId ? { leaderSongId: Number(songId) } : {}),
		});
	};

	const setLeaderSong = async (song: number) => {
		if (leader) {
			await updateLeaderPositionMutation({
				leaderId: leader.id,
				leaderSongId: song,
			});
		}
	};

	return {
		leader,
		takeLead,
		setLeaderSong,
	};
};

export { useLeader };

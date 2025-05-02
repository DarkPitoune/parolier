import { updateLeaderPositionMutation } from "@/utils/supabase";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

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

	const takeLead = (id: string) =>
		{setLeader({
			id,
			leading: true,
		});
		updateLeaderPositionMutation({
			leaderId: id,
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

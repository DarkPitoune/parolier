import { updateLeaderPositionMutation } from "@/utils/supabase";
import { atom, useAtom } from "jotai";

type Leader = {
	id: string;
	leading: boolean;
};

export const leaderAtom = atom<Leader | null>(null);

const useLeader = () => {
	const [leader, setLeader] = useAtom(leaderAtom);

	const takeLead = (id: string) =>
		setLeader({
			id,
			leading: true,
		});

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

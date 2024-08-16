import clsx from "clsx";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import type { Leader } from "@/assets/types";
import supabase from "@/utils/supabase";
import { useAtomValue } from "jotai";
import { usernameAtom } from "./SettingsContext";

const LeaderContext = createContext<
	[Leader | null, (newLeader: Leader | null) => void]
>([null, () => null]);

const useLeader = () => {
	const [leader, setLeader] = useContext(LeaderContext);

	const username = useAtomValue(usernameAtom);
	const takeLead = () => setLeader({ name: username, status: "leader" });

	const setLeaderSong = async (song: number) => {
		if (!leader || leader.status === "follower" || leader.song === song) return;
		const channel = supabase.channel("leader");
		channel.send({
			type: "broadcast",
			event: "update_song",
			payload: { ...leader, song },
		});
		supabase.removeChannel(channel);
		setLeader({ ...leader, song });
	};

	const follow = async (name: string) => {
		setLeader({ status: "follower", name, song: 0 });
	};

	return { leader, takeLead, setLeaderSong, follow };
};

function LeaderContextProvider({
	children,
	navigate,
}: {
	children: ReactNode;
	navigate: (to: string) => void;
}) {
	const [leader, setLeader] = useState<Leader | null>(null);

	const handleUpdateSong = useCallback(
		(newLeader: Leader) => {
			console.log("leader changed");
			if (
				// reasons to not do anything
				!leader || // I'm not following anyone
				leader.name !== newLeader.name || // It's not the person I'm following
				leader.status === "leader" || // I'm the leader
				leader.song === newLeader.song // It's the same song
			)
				return;
			setLeader({ ...newLeader, status: "follower" });
			navigate(`/songs/${newLeader.song}`);
		},
		[leader, navigate],
	);

	useEffect(() => {
		if (!leader) return;
		const leaderRoom = supabase.channel("leader");
		leaderRoom
			.on("broadcast", { event: "update_song" }, ({ payload }) => {
				handleUpdateSong(payload);
			})
			.subscribe();

		return () => {
			supabase.removeChannel(leaderRoom);
		};
	}, [leader, handleUpdateSong]);

	return (
		<LeaderContext.Provider value={[leader, setLeader]}>
			<div
				className={clsx(
					"sticky top-0 right-0 left-0 bg-red-500 text-center transition-all overflow-hidden",
					leader ? "h-6" : "h-0",
				)}
			>
				{leader?.status === "leader" ? (
					<div className="font-semibold">Vous partagez votre session</div>
				) : (
					<div>
						Vous suivez <span className="font-semibold">{leader?.name}</span>
					</div>
				)}
			</div>
			{children}
		</LeaderContext.Provider>
	);
}

export { useLeader, LeaderContextProvider };

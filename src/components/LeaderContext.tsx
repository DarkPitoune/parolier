import type { RealtimePostgresUpdatePayload } from "@supabase/supabase-js";
import clsx from "clsx";
import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";
import type { Leader } from "../assets/types";
import supabase from "../utils/supabase";
import { SettingsContext } from "./SettingsContext";

const LeaderContext = createContext<
	[Leader | null, (newLeader: Leader | null) => void]
>([null, () => null]);

const useLeader = () => {
	const [leader, setLeader] = useContext(LeaderContext);
	const [settings] = useContext(SettingsContext);
	const takeLead = async () =>
		supabase
			.from("leaders")
			.upsert({ name: settings.username, song: 4 })
			.then(() =>
				setLeader({ name: settings.username, song: 4, status: "leader" }),
			);

	const setLeaderSong = async (song: number) => {
		if (!leader || leader.status === "follower" || leader.song === song) return;
		await supabase.from("leaders").upsert({ name: settings.username, song });
		setLeader({ ...leader, song });
	};

	const follow = async (name: string) => {
		setLeader({ status: "follower", name, song: 0 });
	};

	return { leader, takeLead, setLeaderSong, follow };
};

function LeaderContextProvider({
	navigate,
	children,
}: {
	navigate: (to: string) => void;
	children: ReactNode;
}) {
	const [leader, setLeader] = useState<Leader | null>(null);

	useEffect(() => {
		const handleInserts = (
			payload: RealtimePostgresUpdatePayload<{
				name: string;
				song: number;
			}>,
		) => {
			if (
				!leader ||
				leader.status === "leader" ||
				payload.old.name !== leader.name
			)
				return;
			setLeader({
				name: payload.new.name,
				song: payload.new.song,
				status: "follower",
			});
			navigate(`/songs/${payload.new.song}`);
		};
		const channel = supabase.channel("leaders");
		channel
			.on(
				// here, it may be better to listen to broadcast instead of postgres_changes.. i coded this wrong
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "leaders" },
				handleInserts,
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [leader, navigate]);

	return (
		<LeaderContext.Provider value={[leader, setLeader]}>
			<div
				className={clsx(
					"sticky top-0 right-0 left-0 bg-red-500 text-center transition-all",
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
// here
// make it so that the leader changing pages update the state
// then make it possible to follow someone

import { useTaggedSong } from "@/hooks/queries/useSongQueries";
import supabase, { getLeaderPositionQuery } from "@/utils/supabase";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import type { createBrowserRouter } from "react-router-dom";
import type { Database } from "../../database.types";
import { leaderAtom } from "./Contexts/LeaderContext";

type Router = ReturnType<typeof createBrowserRouter>;
type LeaderPosition = Database["public"]["Tables"]["leader_position"]["Row"];
type ConnectionStatus = "connecting" | "connected" | "lost";

const isOnSlideOrPresenter = (path: string) =>
	path.startsWith("/slides") || path.startsWith("/presenter");

const LeaderListener = ({ router }: { router: Router }) => {
	const leader = useAtomValue(leaderAtom);
	const [pathname, setPathname] = useState(router.state.location.pathname);
	const [leaderSong, setLeaderSong] = useState<number | null>(null);
	const [status, setStatus] = useState<ConnectionStatus>("connecting");
	const { data: song } = useTaggedSong(leaderSong ?? undefined);

	useEffect(
		() => router.subscribe((state) => setPathname(state.location.pathname)),
		[router],
	);

	useEffect(() => {
		if (!leader || leader.leading) return;
		let active = true;
		// Realtime does not replay changes missed while the socket was down, so
		// every (re)connection and every return to the foreground re-reads the
		// position. Only a position that actually moved pulls the follower
		// along: one who browsed away on purpose stays put until the leader
		// changes song.
		let lastKnownSong: number | null | undefined;

		const goTo = (song: number | null) => {
			lastKnownSong = song;
			setLeaderSong(song);
			if (
				song !== null &&
				!isOnSlideOrPresenter(router.state.location.pathname)
			)
				router.navigate(`/songs/${song}`);
		};

		const resync = () =>
			getLeaderPositionQuery(leader.id).then(({ data }) => {
				if (!active || !data) return;
				if (data.song === lastKnownSong) return;
				goTo(data.song);
			});

		setStatus("connecting");
		setLeaderSong(null);
		const channel = supabase
			.channel(`leader-position-${leader.id}`)
			.on<LeaderPosition>(
				"postgres_changes",
				{
					schema: "public",
					table: "leader_position",
					filter: `leader_id=eq.${leader.id}`,
					event: "*",
				},
				(payload) => {
					if (payload.eventType === "DELETE") return;
					goTo(payload.new.song);
				},
			)
			.subscribe((channelStatus) => {
				if (!active) return;
				if (channelStatus === "SUBSCRIBED") {
					setStatus("connected");
					resync();
				} else {
					setStatus("lost");
				}
			});

		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") resync();
		};
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			active = false;
			document.removeEventListener("visibilitychange", onVisibilityChange);
			supabase.removeChannel(channel);
		};
	}, [router, leader]);

	const joinLeader = async () => {
		if (!leader) return;
		const { data } = await getLeaderPositionQuery(leader.id);
		const target = data?.song ?? leaderSong;
		if (data) setLeaderSong(data.song);
		if (target !== null) router.navigate(`/songs/${target}`);
	};

	if (!leader) return null;

	if (leader.leading) {
		return (
			<div className="sticky top-0 bg-jubilateRed-400 text-white text-center font-semibold animate-pulseBg h-6">
				Vous partagez votre chant
			</div>
		);
	}

	const isWithLeader =
		leaderSong === null || pathname === `/songs/${leaderSong}`;
	const canJoin = !isWithLeader && !isOnSlideOrPresenter(pathname);

	if (status !== "connected") {
		return (
			<div
				role="status"
				className="sticky top-0 flex h-6 items-center justify-center gap-2 bg-gray-500 px-2 text-sm font-semibold text-white"
			>
				<span className="truncate">
					{status === "lost"
						? `Connexion perdue avec ${leader.id}, reconnexion…`
						: `Connexion à ${leader.id}…`}
				</span>
				{canJoin && <JoinButton onClick={joinLeader} />}
			</div>
		);
	}

	if (canJoin) {
		return (
			<div
				role="status"
				className="sticky top-0 flex h-6 items-center justify-center gap-2 bg-jubilateBlue-500 px-2 text-sm font-semibold text-white"
			>
				<span className="truncate">
					{song
						? `${leader.id} est sur « ${song.title} »`
						: `${leader.id} est sur un autre chant`}
				</span>
				<JoinButton onClick={joinLeader} />
			</div>
		);
	}

	return (
		<div
			role="status"
			className="sticky top-0 bg-jubilateRed-400 text-white text-center font-semibold animate-pulseBg h-6"
		>
			Vous suivez {leader.id}
		</div>
	);
};

const JoinButton = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={onClick}
		className="shrink-0 rounded-full bg-white px-2.5 text-xs leading-5 font-semibold text-jubilateBlue-500"
	>
		Rejoindre
	</button>
);

export { LeaderListener };

import supabase, { getLeaderPositionQuery } from "@/utils/supabase";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import type { createBrowserRouter } from "react-router-dom";
import type { Database } from "../../database.types";
import { leaderAtom } from "./Contexts/LeaderContext";

type Payload = {
	new: Database["public"]["Tables"]["leader_position"]["Row"];
};

const isOnSlideOrPresenter = (
	router: ReturnType<typeof createBrowserRouter>,
) => {
	const path = router.state.location.pathname;
	return path.startsWith("/slides") || path.startsWith("/presenter");
};

const LeaderListener = ({
	router,
}: {
	router: ReturnType<typeof createBrowserRouter>;
}) => {
	const leader = useAtomValue(leaderAtom);

	useEffect(() => {
		if (!leader || leader.leading) return;
		const changes = supabase.channel("schema-db-changes").on(
			"postgres_changes",
			{
				schema: "public",
				table: "leader_position",
				filter: `leader_id=eq.${leader.id}`,
				event: "*",
			},
			(payload) => {
				if (isOnSlideOrPresenter(router)) return;
				const received = payload as unknown as Payload; // I know what I'm doing
				router.navigate(`/songs/${received.new.song}`);
			},
		);
		changes.subscribe();
		return () => {
			changes.unsubscribe();
		};
	}, [router, leader]);

	useEffect(() => {
		if (!leader || leader.leading) return;
		if (isOnSlideOrPresenter(router)) return;
		getLeaderPositionQuery(leader.id).then((res) => {
			if (res.data) {
				router.navigate(`/songs/${res.data.song}`);
			}
		});
	}, [router, leader]);

	if (!leader) return null;

	return (
		<div className="sticky top-0 bg-jubilateRed-400 text-white text-center font-semibold animate-pulseBg h-6">
			{leader?.leading
				? "Vous partagez votre chant"
				: `Vous suivez ${leader?.id}`}
		</div>
	);
};

export { LeaderListener };

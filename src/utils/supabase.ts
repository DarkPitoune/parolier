import { type QueryData, createClient } from "@supabase/supabase-js";
import type { Database } from "../../database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;

export const analyticsSong = async (songId: number) =>
	supabase.from("analytics").insert({ songId });

export const allSongsQuery = async () =>
	supabase
		.from("songs")
		.select("title, id, tags (id, name, svg, color)")
		.order("id");
export type AllSongs = QueryData<ReturnType<typeof allSongsQuery>>;

export const taggedSongQuery = async (songId: number) =>
	supabase
		.from("songs")
		.select("*, tags(name, id, svg, color)")
		.eq("id", songId)
		.single();
export type TaggedSong = QueryData<ReturnType<typeof taggedSongQuery>>;

export const allTagsQuery = async () => supabase.from("tags").select();
export type Tags = QueryData<ReturnType<typeof allTagsQuery>>;

export const setlistQuery = async (setlistId: string) =>
	supabase
		.from("setlist_items")
		.select(
			`id,
			songs (id, strophes, title, tags (id, name, svg, color)),
			text, position,
			setlists (id, name)`,
		)
		.eq("setlist_id", setlistId);
export type Setlist = QueryData<ReturnType<typeof setlistQuery>>;

export const taggedSongFromSetlistStepQuery = async (
	setlistId: string,
	stepNumber: number,
) =>
	supabase
		.from("setlist_items")
		.select("id, songs (*, tags (id, name, svg, color)), position")
		.eq("setlist_id", setlistId)
		.eq("position", stepNumber)
		.single();
export type TaggedSongFromSetlistStep = QueryData<
	ReturnType<typeof taggedSongFromSetlistStepQuery>
>;

export const newSongMutation = async (title: string) =>
	supabase.from("songs").insert({
		title,
		strophes: [{ content: [{ text: "Louons Dieu", chords: "C" }] }],
	}).select().single();
export type NewSongMutation = QueryData<ReturnType<typeof newSongMutation>>;

export const allSetlistsQuery = async () => supabase.from("setlists").select();
export type AllSetlists = QueryData<ReturnType<typeof allSetlistsQuery>>;

export const setlistNameMutation = async (setlistId: string, name: string) =>
	supabase.from("setlists").update({ name }).eq("id", setlistId);
export type SetlistNameMutation = QueryData<
	ReturnType<typeof setlistNameMutation>
>;

export const setlistNameQuery = async (setlistId: string) =>
	supabase.from("setlists").select("name").eq("id", setlistId).single();
export type SetlistNameQuery = QueryData<ReturnType<typeof setlistNameQuery>>;

export const setlistItemPositionMutation = async (
	setlistId: string,
	itemId: number,
	position: number,
) =>
	supabase
		.from("setlist_items")
		.update({ position })
		.eq("setlist_id", setlistId)
		.eq("id", itemId);
export type SetlistItemPositionMutation = QueryData<
	ReturnType<typeof setlistItemPositionMutation>
>;

export const setlistItemDeleteMutation = async (
	setlistId: string,
	itemId: number,
) =>
	supabase
		.from("setlist_items")
		.delete()
		.eq("setlist_id", setlistId)
		.eq("id", itemId);
export type SetlistItemDeleteMutation = QueryData<
	ReturnType<typeof setlistItemDeleteMutation>
>;

export const setlistTextItemMutation = async (
	setlistId: string,
	itemId: number,
	text: string,
) =>
	supabase
		.from("setlist_items")
		.update({ text })
		.eq("setlist_id", setlistId)
		.eq("id", itemId);
export type SetlistTextItemMutation = QueryData<
	ReturnType<typeof setlistTextItemMutation>
>;

export const setlistLengthQuery = async (setlistId: string) =>
	supabase
		.from("setlist_items")
		.select("position")
		.eq("setlist_id", setlistId)
		.order("position", { ascending: false })
		.limit(1);
export type SetlistLength = QueryData<ReturnType<typeof setlistLengthQuery>>;

export const setlistItemAppendMutation = async (
	position: number,
	setlistId: number,
	songId: number | null,
	text: string | null,
) =>
	supabase
		.from("setlist_items")
		.insert({ setlist_id: setlistId, song_id: songId, position, text });
export type SetlistItemAppendMutation = QueryData<
	ReturnType<typeof setlistItemAppendMutation>
>;

export const newSetlistMutation = async () =>
	supabase
		.from("setlists")
		.insert({ name: `Soirée prière du ${new Date().toLocaleDateString()}` });
export type NewSetlistMutation = QueryData<
	ReturnType<typeof newSetlistMutation>
>;

export const deleteSetlistMutation = async (setlistId: number) =>
	supabase.from("setlists").delete().eq("id", setlistId);

export const updateLeaderPositionMutation = async ({
	leaderId,
	leaderSongId,
	leaderSetlistItemId,
}: {
	leaderId: string;
	leaderSongId?: number;
	leaderSetlistItemId?: number;
}) =>
	supabase
		.from("leader_position")
		.upsert({
			leader_id: leaderId,
			song: leaderSongId,
			setlist_item: leaderSetlistItemId,
			updated_at: new Date().toISOString(),
		})
		.select()
		.single();
export type UpdateLeaderPositionMutation = QueryData<
	ReturnType<typeof updateLeaderPositionMutation>
>;

export const getLeaderPositionQuery = async (leaderId: string) =>
	supabase
		.from("leader_position")
		.select("song, setlist_item")
		.eq("leader_id", leaderId)
		.single();
export type GetLeaderPositionQuery = QueryData<ReturnType<typeof getLeaderPositionQuery>>;

export const getLeaderPositionsQuery = async () =>
	supabase
		.from("leader_position")
		.select("leader_id, song, setlist_item, updated_at")
		.order("updated_at", { ascending: false });
export type LeaderPositions = QueryData<
	ReturnType<typeof getLeaderPositionsQuery>
>;

export const getPopularSongsQuery = async (
	startDate?: string,
	endDate?: string,
) => {
	let query = supabase.from("analytics").select(`
			songId,
			songs (title)
		`);

	if (startDate) {
		query = query.gte("created_at", startDate);
	}
	if (endDate) {
		query = query.lte("created_at", endDate);
	}

	return query;
};
export type PopularSongs = QueryData<ReturnType<typeof getPopularSongsQuery>>;

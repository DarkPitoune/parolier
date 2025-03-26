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

export const songQuery = async (songId: number) =>
	supabase.from("songs").select().eq("id", songId).single();
export type Song = QueryData<ReturnType<typeof songQuery>>;

export const allTagsQuery = async () => supabase.from("tags").select();
export type Tags = QueryData<ReturnType<typeof allTagsQuery>>;

export const setlistQuery = async (setlistId: string) =>
	supabase
		.from("setlist_items")
		.select(
			`id,
			songs (id, strophes, title, tags (id, name, svg, color)),
			texts (id, title), position,
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

export const allSetlistsQuery = async () => supabase.from("setlists").select();
export type AllSetlists = QueryData<ReturnType<typeof allSetlistsQuery>>;

export const setlistNameMutation = async (setlistId: string, name: string) =>
	supabase.from("setlists").update({ name }).eq("id", setlistId);
export type SetlistNameMutation = QueryData<
	ReturnType<typeof setlistNameMutation>
>;

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

export const setlistLengthQuery = async (setlistId: string) =>
	supabase
		.from("setlist_items")
		.select("position")
		.eq("setlist_id", setlistId)
		.order("position", { ascending: false })
		.limit(1);
export type SetlistLength = QueryData<ReturnType<typeof setlistLengthQuery>>;

export const setlistItemAppendMutation = async (
	setlistId: number,
	songId: number,
) =>
	supabase
		.from("setlist_items")
		.insert({ setlist_id: setlistId, song_id: songId });
export type SetlistItemAppendMutation = QueryData<
	ReturnType<typeof setlistItemAppendMutation>
>;

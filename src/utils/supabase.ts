import { type QueryData, createClient } from "@supabase/supabase-js";
import type { Database } from "../../database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;

export const analyticsSong = async (songId: number) =>
	supabase.from("analytics").insert({ songId });

export const allSongsQuery = async () =>
	supabase.from("songs").select("title, id, tags (id, name, svg, color)");
export type AllSongs = QueryData<ReturnType<typeof allSongsQuery>>;

export const songQuery = async (songId: number) =>
	supabase
		.from("songs")
		.select("*, tags(name, id, svg, color)")
		.eq("id", songId)
		.single();
export type Song = QueryData<ReturnType<typeof songQuery>>;

export const allTagsQuery = async () => supabase.from("tags").select();
export type Tags = QueryData<ReturnType<typeof allTagsQuery>>;

export const setlistQuery = async (setlistId: string) =>
	supabase
		.from("setlist_items")
		.select("id, songs (id, title, tags (id)), texts (id, title), position")
		.eq("setlist_id", setlistId);
export type Setlist = QueryData<ReturnType<typeof setlistQuery>>;

export const allSetlistsQuery = async () => supabase.from("setlists").select();
export type AllSetlists = QueryData<ReturnType<typeof allSetlistsQuery>>;

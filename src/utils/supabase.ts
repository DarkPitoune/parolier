import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

export const getSong = async (songId: string | undefined) =>
	supabase
		.from("songs")
		.select("*, tags(name, id, svg, color)")
		.eq("id", songId)
		.single();

export const analyticsSong = async (songId: string) =>
	supabase.from("analytics").insert([{ songId }]);

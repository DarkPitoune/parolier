import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;

export const analyticsSong = async (songId: number) =>
	supabase.from("analytics").insert({ songId });

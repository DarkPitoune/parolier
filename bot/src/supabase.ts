import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import type { Database } from "../../database.types";

export type Db = SupabaseClient<Database>;

/** One client per caller, so the revision trigger can record who made an edit. */
export function makeDb(url: string, key: string, editSource: string): Db {
	return createClient<Database>(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { headers: { "x-edit-source": editSource } },
	});
}

export function unwrap<T>(
	result: { data: T; error: { message: string } | null },
	what: string,
): NonNullable<T> {
	if (result.error) throw new Error(`${what}: ${result.error.message}`);
	if (result.data === null || result.data === undefined)
		throw new Error(`${what}: not found`);
	return result.data as NonNullable<T>;
}

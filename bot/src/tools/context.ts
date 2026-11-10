import type { Strophe } from "@/assets/types";
import type { Catalogue } from "../catalogue";
import type { Db } from "../supabase";
import { type Indexed, indexItem } from "../text";

export interface IndexedSong {
	id: number;
	title: string;
	language: string;
	type: string;
	strophes: Strophe[] | null;
	tags: string[];
}

/**
 * All songs with their search keys, re-read at most once a minute and right
 * after a write. Calls made while a read is in flight share it.
 */
export class SongIndex {
	#load: Promise<Indexed<IndexedSong>[]> | null = null;
	#loadedAt = 0;

	constructor(
		private readonly ttlMs = 60_000,
		private readonly now = () => Date.now(),
	) {}

	get(db: Db): Promise<Indexed<IndexedSong>[]> {
		if (this.#load && this.now() - this.#loadedAt < this.ttlMs)
			return this.#load;
		const load = readSongs(db);
		this.#load = load;
		this.#loadedAt = this.now();
		load.catch(() => {
			if (this.#load === load) this.#load = null;
		});
		return load;
	}

	invalidate(): void {
		this.#load = null;
	}
}

async function readSongs(db: Db): Promise<Indexed<IndexedSong>[]> {
	const { data, error } = await db
		.from("songs")
		.select(
			"id, title, language, type, strophes, ordinaires (name), song_tag (tags (name))",
		);
	if (error) throw new Error(`Reading songs: ${error.message}`);
	return (data ?? []).map((row) =>
		indexItem({
			id: row.id,
			title: row.ordinaires
				? `${row.ordinaires.name} - ${row.title}`
				: row.title,
			language: row.language,
			type: row.type,
			strophes: row.strophes,
			tags: (row.song_tag ?? []).flatMap((st) =>
				st.tags?.name ? [st.tags.name] : [],
			),
		}),
	);
}

export interface ToolContext {
	db: Db;
	catalogue: Catalogue;
	appUrl: string;
	songIndex: SongIndex;
}

export const songUrl = (ctx: ToolContext, id: number) =>
	`${ctx.appUrl}/songs/${id}`;
export const ordinaireUrl = (ctx: ToolContext, id: number) =>
	`${ctx.appUrl}/ordinaires/${id}`;
export const setlistUrl = (ctx: ToolContext, id: number) =>
	`${ctx.appUrl}/setlists/${id}`;

export const json = (value: unknown) => JSON.stringify(value);

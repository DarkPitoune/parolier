import { type QueryData, createClient } from "@supabase/supabase-js";
import type { Json } from "../../database-generated.types";
import type { Database } from "../../database.types";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;

export const analyticsSong = async (songId: number) =>
	supabase.from("analytics").insert({ songId });

export const allSongsQuery = async () =>
	supabase
		.from("songs")
		.select("title, id, type, tags (id, name, svg, color)")
		.eq("type", "song")
		.order("id");
export type AllSongs = QueryData<ReturnType<typeof allSongsQuery>>;

export const allRefrainsQuery = async () =>
	supabase
		.from("songs")
		.select("title, id, type, tags (id, name, svg, color)")
		.eq("type", "refrain")
		.order("id");
export type AllRefrains = QueryData<ReturnType<typeof allRefrainsQuery>>;

export const taggedSongQuery = async (songId: number) =>
	supabase
		.from("songs")
		.select("*, tags(name, id, svg, color)")
		.eq("id", songId)
		.single();
export type TaggedSong = QueryData<ReturnType<typeof taggedSongQuery>>;

export const allTaggedSongsQuery = async () =>
	supabase.from("songs").select("*, tags(name, id, svg, color)").order("id");
export type AllTaggedSongs = QueryData<ReturnType<typeof allTaggedSongsQuery>>;

export const allTagsQuery = async () => supabase.from("tags").select();
export type Tags = QueryData<ReturnType<typeof allTagsQuery>>;

export const setlistQuery = async (setlistId: string) =>
	supabase
		.from("setlist_items")
		.select(
			`id,
			songs (id, sheet_music_url, strophes, title, type, ordinaire_id, ordinaire_role, tags (id, name, svg, color)),
			text, position,
			texts (id, title, content, created_at),
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
		.select(
			"id, songs (*, tags (id, name, svg, color)), texts (id, title, content, created_at), text, position",
		)
		.eq("setlist_id", setlistId)
		.eq("position", stepNumber)
		.single();
export type TaggedSongFromSetlistStep = QueryData<
	ReturnType<typeof taggedSongFromSetlistStepQuery>
>;

export const allSetlistItemsQuery = async () =>
	supabase
		.from("setlist_items")
		.select(
			"id, setlist_id, songs (*, tags (id, name, svg, color)), texts (id, title, content, created_at), text, position",
		)
		.order("position");
export type AllSetlistItems = QueryData<
	ReturnType<typeof allSetlistItemsQuery>
>;

export const newSongMutation = async (title: string) =>
	supabase
		.from("songs")
		.insert({
			title,
			strophes: [{ content: [{ text: "Louons Dieu", chords: "C" }] }],
		})
		.select()
		.single();
export type NewSongMutation = QueryData<ReturnType<typeof newSongMutation>>;

export const newRefrainMutation = async (title: string) =>
	supabase
		.from("songs")
		.insert({
			title,
			type: "refrain",
			strophes: [{ content: [{ text: "", chords: "" }] }],
		})
		.select()
		.single();
export type NewRefrainMutation = QueryData<
	ReturnType<typeof newRefrainMutation>
>;

export const allSetlistsQuery = async () =>
	supabase.from("setlists").select().order("created_at", { ascending: false });
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
	textId: number | null = null,
) =>
	supabase.from("setlist_items").insert({
		setlist_id: setlistId,
		song_id: songId,
		position,
		text,
		text_id: textId,
	});
export type SetlistItemAppendMutation = QueryData<
	ReturnType<typeof setlistItemAppendMutation>
>;

export const newSetlistMutation = async () =>
	supabase
		.from("setlists")
		.insert({ name: `Soirée prière du ${new Date().toLocaleDateString()}` })
		.select()
		.single();
export type NewSetlistMutation = QueryData<
	ReturnType<typeof newSetlistMutation>
>;

export const newNamedSetlistMutation = async (name: string) =>
	supabase.from("setlists").insert({ name }).select().single();
export type NewNamedSetlistMutation = QueryData<
	ReturnType<typeof newNamedSetlistMutation>
>;

/** One liturgical slot in a Mass reading (AELF lecture), as plain text ready to
 * become an inline free-text setlist step. HTML→text conversion happens in the
 * caller (this file stays DOM-free). */
export type MesseReading = {
	slot: "lecture_1" | "psaume" | "lecture_2" | "evangile";
	title: string;
	content: string;
};

/** A hymn to slot into the Mass at a given liturgical moment (AI suggestion). */
export type MesseSong = {
	role: "entree" | "offertoire" | "communion" | "envoi";
	songId: number;
};

/** Which parts of the Mass to include when assembling the setlist. */
export type MesseSetlistOptions = {
	/** AI-suggested hymns to place at their liturgical moments. */
	songs?: MesseSong[];
	/** Interleave the assembly responses (type="response" songs). */
	includeResponses?: boolean;
	/** Persist and interleave the day's readings as `texts` rows. */
	includeReadings?: boolean;
};

/**
 * Canonical liturgical order of a Mass, interleaving assembly responses (matched
 * by `ordinaire_role`) with the readings (matched by their `slot`). Opinionated
 * default; entries absent from the DB / readings are skipped, and the assembled
 * setlist stays fully editable afterwards. The gospel sits between the two
 * halves of the gospel acclamation.
 */
const MESSE_ORDER = [
	{ kind: "song", role: "entree" },
	{ kind: "response", role: "salutation" },
	{ kind: "response", role: "acte_penitentiel" },
	{ kind: "reading", slot: "lecture_1" },
	{ kind: "reading", slot: "psaume" },
	{ kind: "reading", slot: "lecture_2" },
	{ kind: "response", role: "conclusion_lecture" },
	{ kind: "response", role: "acclamation_evangile_avant" },
	{ kind: "reading", slot: "evangile" },
	{ kind: "response", role: "acclamation_evangile_apres" },
	{ kind: "response", role: "profession_de_foi" },
	{ kind: "song", role: "offertoire" },
	{ kind: "response", role: "priere_offrandes" },
	{ kind: "response", role: "dialogue_preface" },
	{ kind: "response", role: "anamnese" },
	{ kind: "response", role: "notre_pere" },
	{ kind: "response", role: "doxologie" },
	{ kind: "song", role: "communion" },
	{ kind: "response", role: "communion" },
	{ kind: "song", role: "envoi" },
	{ kind: "response", role: "envoi" },
] as const;

/** Default creed picked when several "profession_de_foi" rows exist (not rigid). */
const DEFAULT_CREED_TITLE = "Symbole de Nicée-Constantinople";

/**
 * Creates a setlist pre-seeded with the Mass in liturgical order: the assembly
 * responses (type="response" songs) interleaved with the day's readings. The
 * readings are stored inline as free `text` on the setlist item (not as reusable
 * `texts` rows) since they're one-off, day-specific content. For the creed (two
 * variants share the "profession_de_foi" role) it inserts the default one; the
 * other stays available to swap in. Readings absent for the day are skipped.
 */
export const newMesseSetlistMutation = async (
	name: string,
	readings: MesseReading[] = [],
	options: MesseSetlistOptions = {},
) => {
	const {
		songs = [],
		includeResponses = true,
		includeReadings = true,
	} = options;

	const { data: setlist, error } = await supabase
		.from("setlists")
		.insert({ name })
		.select()
		.single();
	if (error || !setlist) return { data: setlist, error };

	let responses: {
		id: number;
		title: string;
		ordinaire_role: string | null;
	}[] = [];
	if (includeResponses) {
		const { data, error: responsesError } = await supabase
			.from("songs")
			.select("id, title, ordinaire_role")
			.eq("type", "response");
		if (responsesError) return { data: setlist, error: responsesError };
		responses = data ?? [];
	}

	// Each reading becomes an inline free-text step: its title as the first line
	// (so it reads as a heading) followed by the content.
	const slotToText = new Map<MesseReading["slot"], string>();
	if (includeReadings) {
		for (const reading of readings) {
			slotToText.set(reading.slot, `${reading.title}\n\n${reading.content}`);
		}
	}

	const items: { song_id: number | null; text: string | null }[] = [];
	for (const entry of MESSE_ORDER) {
		if (entry.kind === "song") {
			const song = songs.find((s) => s.role === entry.role);
			if (song) items.push({ song_id: song.songId, text: null });
		} else if (entry.kind === "response") {
			const matches = responses.filter((r) => r.ordinaire_role === entry.role);
			if (matches.length === 0) continue;
			const picked =
				entry.role === "profession_de_foi" && matches.length > 1
					? [matches.find((r) => r.title === DEFAULT_CREED_TITLE) ?? matches[0]]
					: matches;
			for (const r of picked) items.push({ song_id: r.id, text: null });
		} else {
			const text = slotToText.get(entry.slot);
			if (text !== undefined) items.push({ song_id: null, text });
		}
	}

	if (items.length > 0) {
		const { error: itemsError } = await supabase.from("setlist_items").insert(
			items.map((item, position) => ({
				setlist_id: setlist.id,
				song_id: item.song_id,
				position,
				text: item.text,
				text_id: null,
			})),
		);
		if (itemsError) return { data: setlist, error: itemsError };
	}

	return { data: setlist, error: null };
};

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
export type GetLeaderPositionQuery = QueryData<
	ReturnType<typeof getLeaderPositionQuery>
>;

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
	return await supabase.rpc("get_popular_songs", {
		start_date: startDate || undefined,
		end_date: endDate || undefined,
	});
};
export type PopularSongs = QueryData<ReturnType<typeof getPopularSongsQuery>>;

// Texts queries
export const allTextsQuery = async () =>
	supabase.from("texts").select("id, title, content, created_at").order("id");
export type AllTexts = QueryData<ReturnType<typeof allTextsQuery>>;

export const textQuery = async (textId: number) =>
	supabase.from("texts").select("*").eq("id", textId).single();
export type Text = QueryData<ReturnType<typeof textQuery>>;

// Mass suggestions cache
export const massSuggestionsQuery = async (date: string) =>
	supabase.from("mass_suggestions").select("*").eq("date", date).maybeSingle();

export const upsertMassSuggestionsMutation = async (
	date: string,
	suggestions: unknown,
	liturgicalSummary: string | null,
) =>
	supabase
		.from("mass_suggestions")
		.upsert({
			date,
			suggestions: suggestions as Json,
			liturgical_summary: liturgicalSummary,
		})
		.select()
		.single();

export const newTextMutation = async (title: string, content: string) =>
	supabase
		.from("texts")
		.insert({
			title,
			content,
		})
		.select()
		.single();
export type NewTextMutation = QueryData<ReturnType<typeof newTextMutation>>;

// Ordinaires queries
export const allOrdinairesQuery = async () =>
	supabase.from("ordinaires").select("id, name, sheet_music_url").order("name");
export type AllOrdinaires = QueryData<ReturnType<typeof allOrdinairesQuery>>;

export const ordinaireDetailQuery = async (id: number) =>
	supabase
		.from("ordinaires")
		.select(
			"id, name, sheet_music_url, songs (id, title, strophes, type, sheet_music_url, ordinaire_role, tags (id, name, svg, color))",
		)
		.eq("id", id)
		.single();
export type OrdinaireDetail = QueryData<
	ReturnType<typeof ordinaireDetailQuery>
>;

export const allOrdinaireSongsQuery = async () =>
	supabase
		.from("songs")
		.select(
			"title, id, type, ordinaire_id, ordinaire_role, tags (id, name, svg, color)",
		)
		.eq("type", "ordinaire")
		.order("ordinaire_id")
		.order("id");
export type AllOrdinaireSongs = QueryData<
	ReturnType<typeof allOrdinaireSongsQuery>
>;

export const newOrdinaireMutation = async (name: string) =>
	supabase.from("ordinaires").insert({ name }).select().single();
export type NewOrdinaireMutation = QueryData<
	ReturnType<typeof newOrdinaireMutation>
>;

export const newOrdinaireSongMutation = async (
	title: string,
	ordinaireId: number,
	role: string,
) =>
	supabase
		.from("songs")
		.insert({
			title,
			type: "ordinaire",
			ordinaire_id: ordinaireId,
			ordinaire_role: role,
			strophes: [{ content: [{ text: "", chords: "" }] }],
		})
		.select()
		.single();
export type NewOrdinaireSongMutation = QueryData<
	ReturnType<typeof newOrdinaireSongMutation>
>;

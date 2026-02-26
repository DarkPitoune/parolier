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

export const updateOrdinaireSheetMusic = async (
	id: number,
	sheetMusicUrl: string | null,
) =>
	supabase
		.from("ordinaires")
		.update({ sheet_music_url: sheetMusicUrl })
		.eq("id", id);

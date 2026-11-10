import type { Strophe } from "@/assets/types";
import { z } from "zod";
import type { Json } from "../../../database.types";
import { unwrap } from "../supabase";
import { firstLine, indexItem, isLikelyDuplicate, search } from "../text";
import { type ToolContext, json, songUrl } from "./context";
import { defineTool } from "./tool";
import {
	applyStropheEdits,
	cleanStrophes,
	stropheEditSchema,
	stropheVersion,
	strophesSchema,
} from "./validate";

const languageSchema = z.enum(["fr", "en"]);

async function knownTagIds(ctx: ToolContext, ids: number[]): Promise<number[]> {
	if (ids.length === 0) return [];
	const tags = unwrap(
		await ctx.db.from("tags").select("id, name"),
		"Reading tags",
	);
	const known = new Set(tags.map((t) => t.id));
	const unknown = ids.filter((id) => !known.has(id));
	if (unknown.length > 0) {
		throw new Error(
			`Unknown tag ids ${unknown.join(", ")}. Use list_tags; new tags cannot be created.`,
		);
	}
	return [...new Set(ids)];
}

async function setTags(
	ctx: ToolContext,
	songId: number,
	tagIds: number[],
): Promise<void> {
	const del = await ctx.db.from("song_tag").delete().eq("song_id", songId);
	if (del.error) throw new Error(`Clearing tags: ${del.error.message}`);
	if (tagIds.length === 0) return;
	const ins = await ctx.db
		.from("song_tag")
		.insert(tagIds.map((tag_id) => ({ song_id: songId, tag_id })));
	if (ins.error) throw new Error(`Setting tags: ${ins.error.message}`);
}

export async function findDuplicates(
	ctx: ToolContext,
	title: string,
	strophes: Strophe[],
) {
	const candidate = indexItem({ title, strophes });
	const songs = await ctx.songIndex.get(ctx.db);
	return songs
		.filter((entry) => isLikelyDuplicate(candidate, entry))
		.map((entry) => ({
			id: entry.item.id,
			title: entry.item.title,
			first_line: firstLine(entry.item.strophes),
			url: songUrl(ctx, entry.item.id),
		}));
}

export async function insertSong(
	ctx: ToolContext,
	song: {
		title: string;
		language: "fr" | "en";
		strophes: Strophe[];
		tagIds: number[];
	},
) {
	const tagIds = await knownTagIds(ctx, song.tagIds);
	const row = unwrap(
		await ctx.db
			.from("songs")
			.insert({
				title: song.title.trim(),
				language: song.language,
				type: "song",
				strophes: song.strophes as unknown as Json[],
			})
			.select("id")
			.single(),
		"Creating the song",
	);
	await setTags(ctx, row.id, tagIds);
	ctx.songIndex.invalidate();
	return row.id;
}

export function songTools(ctx: ToolContext) {
	return [
		defineTool({
			name: "search_songs",
			description:
				"Search the Parolier (the community's song database) by title, first line or any lyric words. Accents and case are ignored. Always call this before adding a song.",
			schema: z.object({
				query: z.string().min(1),
				language: languageSchema.optional(),
			}),
			run: async ({ query, language }) => {
				const songs = await ctx.songIndex.get(ctx.db);
				const pool = language
					? songs.filter((s) => s.item.language === language)
					: songs;
				return json(
					search(pool, query).map(({ item, score }) => ({
						id: item.id,
						title: item.title,
						language: item.language,
						type: item.type,
						tags: item.tags,
						first_line: firstLine(item.strophes),
						match: score,
					})),
				);
			},
		}),

		defineTool({
			name: "get_song",
			description:
				"Read one Parolier song with numbered strophes. The returned `version` must be passed to edit_song. A part of a Mass ordinary also says which ordinaire and role it belongs to.",
			schema: z.object({ id: z.number().int() }),
			run: async ({ id }) => {
				const song = unwrap(
					await ctx.db
						.from("songs")
						.select(
							"id, title, language, type, strophes, ordinaire_id, ordinaire_role, ordinaires (name), song_tag (tags (id, name))",
						)
						.eq("id", id)
						.maybeSingle(),
					`Reading song ${id}`,
				);
				return json({
					id: song.id,
					title: song.title,
					language: song.language,
					type: song.type,
					tags: (song.song_tag ?? []).flatMap((st) =>
						st.tags ? [st.tags] : [],
					),
					...(song.ordinaire_id && song.ordinaires
						? {
								ordinaire: {
									id: song.ordinaire_id,
									name: song.ordinaires.name,
									role: song.ordinaire_role,
								},
							}
						: {}),
					version: stropheVersion(song.title, song.strophes),
					strophes: (song.strophes ?? []).map((s, index) => {
						if (s.type === "section")
							return { index, type: s.type, content: s.content };
						return {
							index,
							type: s.type,
							repetition: s.repetition,
							content: s.content,
							has_note: Boolean(s.note),
						};
					}),
					url: songUrl(ctx, song.id),
				});
			},
		}),

		defineTool({
			name: "list_tags",
			description:
				"The fixed list of song tags (themes). Only these ids can be used; tags cannot be created.",
			schema: z.object({}),
			run: async () =>
				json(
					unwrap(
						await ctx.db.from("tags").select("id, name").order("name"),
						"Reading tags",
					),
				),
		}),

		defineTool({
			name: "create_song",
			description:
				"Create a new song from lyrics you transcribed (pasted text, a photo, a screenshot, a confirmed web source). Refuses when a song with the same title or first line already exists, unless allow_duplicate is true because the user confirmed it is a different song. For songs found in the import catalogue, use import_from_catalogue instead.",
			schema: z.object({
				title: z.string().min(1),
				language: languageSchema,
				strophes: strophesSchema,
				tag_ids: z.array(z.number().int()),
				allow_duplicate: z.boolean().optional(),
			}),
			run: async ({ title, language, strophes, tag_ids, allow_duplicate }) => {
				const clean = cleanStrophes(strophes);
				if (!allow_duplicate) {
					const duplicates = await findDuplicates(ctx, title, clean);
					if (duplicates.length > 0) {
						return json({
							created: false,
							reason: "likely_duplicate",
							candidates: duplicates,
						});
					}
				}
				const id = await insertSong(ctx, {
					title,
					language,
					strophes: clean,
					tagIds: tag_ids,
				});
				return json({
					created: true,
					id,
					title: title.trim(),
					strophes: clean.length,
					url: songUrl(ctx, id),
				});
			},
		}),

		defineTool({
			name: "edit_song",
			description:
				"Change an existing song: title, language, tags (replaces the whole set) and/or strophes. Strophe edits use the indices from get_song: replace, delete, or insert after an index (-1 = at the start). Untouched strophes and playing notes are kept. Refuses when the song changed since get_song.",
			schema: z.object({
				id: z.number().int(),
				version: z.string().describe("The version returned by get_song."),
				title: z.string().min(1).optional(),
				language: languageSchema.optional(),
				tag_ids: z.array(z.number().int()).optional(),
				strophe_edits: z.array(stropheEditSchema).optional(),
			}),
			run: async ({ id, version, title, language, tag_ids, strophe_edits }) => {
				const song = unwrap(
					await ctx.db
						.from("songs")
						.select("id, title, strophes")
						.eq("id", id)
						.maybeSingle(),
					`Reading song ${id}`,
				);
				if (stropheVersion(song.title, song.strophes) !== version) {
					return json({
						updated: false,
						reason: "changed_since_read",
						hint: "Call get_song again.",
					});
				}
				const before = song.strophes ?? [];
				const strophes = strophe_edits?.length
					? applyStropheEdits(before, strophe_edits)
					: undefined;
				const tagIds = tag_ids ? await knownTagIds(ctx, tag_ids) : undefined;
				const update: {
					title?: string;
					language?: "fr" | "en";
					strophes?: Json[];
				} = {};
				if (title !== undefined) update.title = title.trim();
				if (language !== undefined) update.language = language;
				if (strophes !== undefined)
					update.strophes = strophes as unknown as Json[];
				if (Object.keys(update).length > 0) {
					const res = await ctx.db.from("songs").update(update).eq("id", id);
					if (res.error)
						throw new Error(`Updating song ${id}: ${res.error.message}`);
				}
				if (tagIds) await setTags(ctx, id, tagIds);
				ctx.songIndex.invalidate();
				return json({
					updated: true,
					id,
					strophes: (strophes ?? before).length,
					url: songUrl(ctx, id),
				});
			},
		}),

		defineTool({
			name: "undo_song_edit",
			description:
				"Put a song back to its previous version (before the last change, whether made here or in the app). Undoing twice re-applies the change.",
			schema: z.object({ id: z.number().int() }),
			run: async ({ id }) => {
				const restored = unwrap(
					await ctx.db.rpc("undo_song_edit", { p_song_id: id }),
					`Restoring song ${id}`,
				) as { title: string; version_from: string };
				ctx.songIndex.invalidate();
				return json({ restored: true, id, ...restored, url: songUrl(ctx, id) });
			},
		}),
	];
}

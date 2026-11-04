import { sortSetlistItems } from "@/utils/setlistOrder";
import { z } from "zod";
import { unwrap } from "../supabase";
import { type ToolContext, json, setlistUrl, songUrl } from "./context";
import { defineTool } from "./tool";

const itemSchema = z.union([
	z.object({ song_id: z.number().int() }),
	z.object({
		text: z
			.string()
			.min(1)
			.describe(
				"A free item with no song: a silence, a reading, a song not in the Parolier.",
			),
	}),
]);
type Item = z.infer<typeof itemSchema>;

async function checkSongIds(ctx: ToolContext, items: Item[]): Promise<void> {
	const ids = [
		...new Set(items.flatMap((i) => ("song_id" in i ? [i.song_id] : []))),
	];
	if (ids.length === 0) return;
	const rows = unwrap(
		await ctx.db.from("songs").select("id").in("id", ids),
		"Checking songs",
	);
	const found = new Set(rows.map((r) => r.id));
	const missing = ids.filter((id) => !found.has(id));
	if (missing.length > 0)
		throw new Error(`No song with id ${missing.join(", ")}`);
}

async function insertItems(
	ctx: ToolContext,
	setlistId: number,
	items: Item[],
	startAt: number,
) {
	const res = await ctx.db.from("setlist_items").insert(
		items.map((item, i) => ({
			setlist_id: setlistId,
			position: startAt + i,
			song_id: "song_id" in item ? item.song_id : null,
			text: "text" in item ? item.text.trim() : null,
		})),
	);
	if (res.error) throw new Error(`Adding setlist items: ${res.error.message}`);
}

export function setlistTools(ctx: ToolContext) {
	return [
		defineTool({
			name: "recent_setlists",
			description:
				"The 15 most recent setlists, newest first, plus every setlist tag already in use (reuse those tags rather than inventing new ones).",
			schema: z.object({}),
			run: async () => {
				const recent = unwrap(
					await ctx.db
						.from("setlists")
						.select("id, name, tags, created_at")
						.order("created_at", { ascending: false })
						.limit(15),
					"Reading setlists",
				);
				const all = unwrap(
					await ctx.db.from("setlists").select("tags"),
					"Reading setlist tags",
				);
				const tags = [...new Set(all.flatMap((s) => s.tags))].sort((a, b) =>
					a.localeCompare(b, "fr"),
				);
				return json({
					setlists: recent.map((s) => ({ ...s, url: setlistUrl(ctx, s.id) })),
					setlist_tags: tags,
				});
			},
		}),

		defineTool({
			name: "get_setlist",
			description: "Read one setlist with its items in order.",
			schema: z.object({ id: z.number().int() }),
			run: async ({ id }) => {
				const setlist = unwrap(
					await ctx.db
						.from("setlists")
						.select(
							"id, name, tags, setlist_items (id, position, song_id, text, songs (title))",
						)
						.eq("id", id)
						.maybeSingle(),
					`Reading setlist ${id}`,
				);
				return json({
					id: setlist.id,
					name: setlist.name,
					tags: setlist.tags,
					items: sortSetlistItems(setlist.setlist_items).map((item, step) => ({
						step: step + 1,
						...(item.song_id
							? {
									song_id: item.song_id,
									title: item.songs?.title,
									url: songUrl(ctx, item.song_id),
								}
							: { text: item.text }),
					})),
					url: setlistUrl(ctx, setlist.id),
				});
			},
		}),

		defineTool({
			name: "create_setlist",
			description:
				"Create a setlist with its items in order. Each item is a Parolier song id or a free text.",
			schema: z.object({
				name: z.string().min(1),
				tags: z.array(z.string()),
				items: z.array(itemSchema).min(1),
			}),
			run: async ({ name, tags, items }) => {
				await checkSongIds(ctx, items);
				const setlist = unwrap(
					await ctx.db
						.from("setlists")
						.insert({ name: name.trim(), tags })
						.select("id")
						.single(),
					"Creating the setlist",
				);
				try {
					await insertItems(ctx, setlist.id, items, 0);
				} catch (error) {
					await ctx.db.from("setlists").delete().eq("id", setlist.id);
					throw error;
				}
				return json({
					created: true,
					id: setlist.id,
					items: items.length,
					url: setlistUrl(ctx, setlist.id),
				});
			},
		}),

		defineTool({
			name: "append_to_setlist",
			description: "Add items at the end of an existing setlist.",
			schema: z.object({
				id: z.number().int(),
				items: z.array(itemSchema).min(1),
			}),
			run: async ({ id, items }) => {
				await checkSongIds(ctx, items);
				const existing = unwrap(
					await ctx.db
						.from("setlist_items")
						.select("position")
						.eq("setlist_id", id),
					`Reading setlist ${id}`,
				);
				const next = existing.reduce(
					(max, r) => Math.max(max, r.position + 1),
					0,
				);
				await insertItems(ctx, id, items, next);
				return json({
					appended: items.length,
					total: existing.length + items.length,
					url: setlistUrl(ctx, id),
				});
			},
		}),
	];
}

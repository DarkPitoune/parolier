import { z } from "zod";
import { firstLine, search } from "../text";
import { type ToolContext, json, songUrl } from "./context";
import { findDuplicates, insertSong } from "./songs";
import { defineTool } from "./tool";
import { cleanStrophes, strophesSchema } from "./validate";

export function catalogueTools(ctx: ToolContext) {
	return [
		defineTool({
			name: "search_catalogue",
			description:
				"Search the import catalogue: about 1,500 songs (with lyrics, often chords) not all in the Parolier yet. `in_parolier` lists Parolier songs that look like the same song. Search here before the web.",
			schema: z.object({ query: z.string().min(1) }),
			run: async ({ query }) => {
				const hits = search(ctx.catalogue.entries(), query);
				return json(
					await Promise.all(
						hits.map(async ({ item, score }) => ({
							cid: item.cid,
							cote: item.cote,
							title: item.title,
							tags: item.tags,
							has_chords: item.hasChords,
							first_line: firstLine(item.strophes),
							match: score,
							in_parolier: (
								await findDuplicates(ctx, item.title, item.strophes)
							).map((d) => d.id),
						})),
					),
				);
			},
		}),

		defineTool({
			name: "get_catalogue_song",
			description: "Read one catalogue song with its strophes, for a preview.",
			schema: z.object({ cid: z.number().int() }),
			run: async ({ cid }) => {
				const entry = ctx.catalogue.get(cid);
				if (!entry) throw new Error(`No catalogue song with cid ${cid}`);
				return json(entry);
			},
		}),

		defineTool({
			name: "import_from_catalogue",
			description:
				"Add a catalogue song to the Parolier, copying its lyrics and chords exactly. Prefer this over create_song whenever the song is in the catalogue. The title defaults to the catalogue title without qualifiers you may drop (e.g. a trailing author or source). Refuses likely duplicates unless allow_duplicate is true.",
			schema: z.object({
				cid: z.number().int(),
				tag_ids: z.array(z.number().int()),
				title: z.string().min(1).optional(),
				language: z.enum(["fr", "en"]).optional().describe("Defaults to fr."),
				allow_duplicate: z.boolean().optional(),
			}),
			run: async ({ cid, tag_ids, title, language, allow_duplicate }) => {
				const entry = ctx.catalogue.get(cid);
				if (!entry) throw new Error(`No catalogue song with cid ${cid}`);
				const strophes = cleanStrophes(strophesSchema.parse(entry.strophes));
				const finalTitle = (title ?? entry.title).trim();
				if (!allow_duplicate) {
					const duplicates = [
						...(await findDuplicates(ctx, finalTitle, strophes)),
						...(await findDuplicates(ctx, entry.title, strophes)),
					];
					if (duplicates.length > 0) {
						const unique = [
							...new Map(duplicates.map((d) => [d.id, d])).values(),
						];
						return json({
							created: false,
							reason: "likely_duplicate",
							candidates: unique,
						});
					}
				}
				const id = await insertSong(ctx, {
					title: finalTitle,
					language: language ?? "fr",
					strophes,
					tagIds: tag_ids,
				});
				return json({
					created: true,
					id,
					title: finalTitle,
					cote: entry.cote,
					strophes: strophes.length,
					url: songUrl(ctx, id),
				});
			},
		}),
	];
}

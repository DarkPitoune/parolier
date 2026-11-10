import type { Strophe } from "@/assets/types";
import { z } from "zod";
import type { Json } from "../../../database.types";
import { unwrap } from "../supabase";
import { searchKey } from "../text";
import { type ToolContext, json, ordinaireUrl, songUrl } from "./context";
import { defineTool } from "./tool";
import { cleanStrophes, strophesSchema } from "./validate";

const ORDINAIRE_ROLES = {
	kyrie: "Kyrie",
	gloria: "Gloria",
	alleluia: "Alleluia",
	sanctus: "Sanctus",
	anamnese: "Anamnèse",
	agnus: "Agnus Dei",
} as const;
const roleSchema = z.enum([
	"kyrie",
	"gloria",
	"alleluia",
	"sanctus",
	"anamnese",
	"agnus",
]);
const roles = roleSchema.options;

function catalogueStrophes(ctx: ToolContext, cid: number) {
	const entry = ctx.catalogue.get(cid);
	if (!entry) throw new Error(`No catalogue song with cid ${cid}`);
	return entry.strophes;
}

async function readOrdinaires(ctx: ToolContext) {
	return unwrap(
		await ctx.db
			.from("ordinaires")
			.select("id, name, songs (id, title, ordinaire_role)")
			.order("name"),
		"Reading ordinaires",
	);
}

export function ordinaireTools(ctx: ToolContext) {
	return [
		defineTool({
			name: "list_ordinaires",
			description:
				"Every Mass ordinary (ordinaire: Messe de …) in the Parolier, with its sung parts by role and the roles still missing. Check here before creating one.",
			schema: z.object({}),
			run: async () =>
				json(
					(await readOrdinaires(ctx)).map((o) => {
						const filled = new Set(o.songs.map((s) => s.ordinaire_role));
						return {
							id: o.id,
							name: o.name,
							parts: o.songs.map((s) => ({
								song_id: s.id,
								role: s.ordinaire_role,
								title: s.title,
							})),
							missing_roles: roles.filter((r) => !filled.has(r)),
							url: ordinaireUrl(ctx, o.id),
						};
					}),
				),
		}),

		defineTool({
			name: "create_ordinaire",
			description:
				"Create an empty Mass ordinary (e.g. « Messe de Saint Thomas »), then fill it with add_ordinaire_part. Refuses when one with the same name exists.",
			schema: z.object({ name: z.string().min(1) }),
			run: async ({ name }) => {
				const key = searchKey(name);
				const existing = (await readOrdinaires(ctx)).find(
					(o) => searchKey(o.name) === key,
				);
				if (existing) {
					return json({
						created: false,
						reason: "exists",
						id: existing.id,
						url: ordinaireUrl(ctx, existing.id),
					});
				}
				const row = unwrap(
					await ctx.db
						.from("ordinaires")
						.insert({ name: name.trim() })
						.select("id")
						.single(),
					"Creating the ordinaire",
				);
				return json({
					created: true,
					id: row.id,
					url: ordinaireUrl(ctx, row.id),
				});
			},
		}),

		defineTool({
			name: "rename_ordinaire",
			description: "Rename a Mass ordinary.",
			schema: z.object({ id: z.number().int(), name: z.string().min(1) }),
			run: async ({ id, name }) => {
				unwrap(
					await ctx.db
						.from("ordinaires")
						.update({ name: name.trim() })
						.eq("id", id)
						.select("id")
						.maybeSingle(),
					`Renaming ordinaire ${id}`,
				);
				ctx.songIndex.invalidate();
				return json({ renamed: true, id, url: ordinaireUrl(ctx, id) });
			},
		}),

		defineTool({
			name: "add_ordinaire_part",
			description:
				"Add one sung part (Kyrie, Gloria, …) to a Mass ordinary, either from the import catalogue (cid, copied exactly) or from strophes you transcribed. Each role holds one part: to change an existing part, use get_song and edit_song on it. Calls for different roles can run in parallel.",
			schema: z
				.object({
					ordinaire_id: z.number().int(),
					role: roleSchema,
					cid: z.number().int().optional(),
					strophes: strophesSchema.optional(),
					language: z.enum(["fr", "en"]).optional().describe("Defaults to fr."),
				})
				.refine((v) => (v.cid === undefined) !== (v.strophes === undefined), {
					message: "Pass exactly one of cid or strophes.",
				}),
			run: async ({ ordinaire_id, role, cid, strophes, language }) => {
				const ordinaire = unwrap(
					await ctx.db
						.from("ordinaires")
						.select("id, songs (id, ordinaire_role)")
						.eq("id", ordinaire_id)
						.maybeSingle(),
					`Reading ordinaire ${ordinaire_id}`,
				);
				const taken = ordinaire.songs.find((s) => s.ordinaire_role === role);
				if (taken) {
					return json({
						created: false,
						reason: "role_taken",
						song_id: taken.id,
						url: songUrl(ctx, taken.id),
					});
				}
				const clean: Strophe[] = cleanStrophes(
					strophesSchema.parse(
						cid === undefined ? strophes : catalogueStrophes(ctx, cid),
					),
				);
				const row = unwrap(
					await ctx.db
						.from("songs")
						.insert({
							title: ORDINAIRE_ROLES[role],
							type: "ordinaire",
							ordinaire_id,
							ordinaire_role: role,
							language: language ?? "fr",
							strophes: clean as unknown as Json[],
						})
						.select("id")
						.single(),
					"Creating the ordinaire part",
				);
				ctx.songIndex.invalidate();
				return json({
					created: true,
					song_id: row.id,
					role,
					strophes: clean.length,
					url: songUrl(ctx, row.id),
					ordinaire_url: ordinaireUrl(ctx, ordinaire_id),
				});
			},
		}),
	];
}

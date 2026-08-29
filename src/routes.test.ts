import { appRoutes } from "./routes";

/**
 * PLAN-01 1.6c — the route inventory.
 *
 * This asserts the *exact* set of paths, not a subset, and that is the whole
 * point: a route cannot appear or disappear without this test failing, so every
 * intentional deletion has to edit the list here in the same commit. Phase 2
 * removes /tuner and /bible/today, Phase 3 removes /certificate — each of those
 * is expected to turn this red exactly once.
 *
 * PLAN-02 adds a per-tenant feature-flag filter over `appRoutes`. This is then
 * what stops the filter from silently dropping a route for Jubilate.
 */
const EXPECTED_PATHS = [
	"/",
	"/analytics",
	"/bible",
	"/bible/:book",
	"/bible/:book/:chapter",
	"/bible/today",
	"/cache",
	"/certificate",
	"/messe",
	"/ordinaires",
	"/ordinaires/:ordinaireId",
	"/presenter",
	"/presenter/:setlistId/:stepNumber",
	"/refrains",
	"/setlists",
	"/setlists/:setlistId",
	"/setlists/:setlistId/edit",
	"/setlists/:setlistId/steps/:stepNumber/slide",
	"/slides",
	"/slides/:songId",
	"/songs/:songId",
	"/songs/:songId/edit",
	"/texts",
	"/texts/:textId",
	"/texts/:textId/edit",
	"/tuner",
	"*",
];

describe("route inventory", () => {
	const actual = appRoutes.map((r) => r.path).filter((p): p is string => !!p);

	it("exposes exactly the paths we intend, no more and no fewer", () => {
		expect([...actual].sort()).toEqual([...EXPECTED_PATHS].sort());
	});

	it("gives every route an element to render", () => {
		for (const route of appRoutes) {
			expect(route.element, `route ${route.path} has no element`).toBeDefined();
		}
	});

	it("declares no path twice", () => {
		expect(new Set(actual).size).toBe(actual.length);
	});

	it("still serves a catch-all", () => {
		// Without this a mistyped URL renders blank rather than the 404.
		expect(actual).toContain("*");
	});
});

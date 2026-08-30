import { appRoutes } from "./routes";

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
		expect(actual).toContain("*");
	});
});

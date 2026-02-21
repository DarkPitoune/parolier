import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
	describe("songs", () => {
		it("list returns stable key", () => {
			expect(queryKeys.songs.list()).toEqual(["songs", "list"]);
		});

		it("detail includes song id", () => {
			expect(queryKeys.songs.detail(42)).toEqual(["songs", 42]);
		});
	});

	describe("tags", () => {
		it("all returns stable key", () => {
			expect(queryKeys.tags.all()).toEqual(["tags"]);
		});
	});

	describe("setlists", () => {
		it("list returns stable key", () => {
			expect(queryKeys.setlists.list()).toEqual(["setlists", "list"]);
		});

		it("detail includes setlist id", () => {
			expect(queryKeys.setlists.detail("abc")).toEqual(["setlists", "abc"]);
		});

		it("step includes setlist id and step number", () => {
			expect(queryKeys.setlists.step("abc", 3)).toEqual([
				"setlists",
				"abc",
				"step",
				3,
			]);
		});

		it("length includes setlist id", () => {
			expect(queryKeys.setlists.length("abc")).toEqual([
				"setlists",
				"abc",
				"length",
			]);
		});
	});

	describe("texts", () => {
		it("list returns stable key", () => {
			expect(queryKeys.texts.list()).toEqual(["texts", "list"]);
		});

		it("detail includes text id", () => {
			expect(queryKeys.texts.detail(7)).toEqual(["texts", 7]);
		});
	});
});

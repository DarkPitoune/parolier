import type { Message } from "grammy/types";
import { describe, expect, it } from "vitest";
import { parseAllowedUsers } from "./config";
import { DailyCap, History } from "./history";
import { command, isAddressed, splitForTelegram } from "./routing";

const bot = { id: 42, username: "parolier_bot" };
const msg = (text: string, extra: Record<string, unknown> = {}) =>
	({
		message_id: 1,
		date: 0,
		chat: { id: -100, type: "supergroup", title: "Musique" },
		from: { id: 7, is_bot: false, first_name: "Théo" },
		text,
		...extra,
	}) as unknown as Message;

describe("isAddressed", () => {
	it("answers every direct message", () => {
		expect(
			isAddressed(
				msg("salut", { chat: { id: 7, type: "private", first_name: "Théo" } }),
				bot,
			),
		).toBe(true);
	});

	it("in a group, answers only when called, mentioned or replied to", () => {
		expect(isAddressed(msg("Quelqu'un a la grille ?"), bot)).toBe(false);
		expect(isAddressed(msg("Claude, donne la grille"), bot)).toBe(true);
		expect(isAddressed(msg("claude: ajoute ça"), bot)).toBe(true);
		expect(isAddressed(msg("Parolier, ajoute ça"), bot)).toBe(true);
		expect(isAddressed(msg("Claudette arrive"), bot)).toBe(false);
		expect(isAddressed(msg("hey @Parolier_bot ajoute"), bot)).toBe(true);
		expect(
			isAddressed(msg("ok", { reply_to_message: { from: { id: 42 } } }), bot),
		).toBe(true);
		expect(
			isAddressed(
				msg("", { caption: "Claude, celui-là", text: undefined }),
				bot,
			),
		).toBe(true);
	});
});

describe("command", () => {
	it("reads commands addressed to this bot only", () => {
		expect(command(msg("/new"), bot)).toBe("new");
		expect(command(msg("/whoami@parolier_bot"), bot)).toBe("whoami");
		expect(command(msg("/new@other_bot"), bot)).toBeUndefined();
		expect(command(msg("pas une commande"), bot)).toBeUndefined();
	});
});

describe("splitForTelegram", () => {
	it("cuts long replies at line breaks under the limit", () => {
		const parts = splitForTelegram(`${"a".repeat(30)}\n${"b".repeat(30)}`, 40);
		expect(parts).toEqual(["a".repeat(30), "b".repeat(30)]);
	});
});

describe("parseAllowedUsers", () => {
	it("maps ids to names", () => {
		expect([...parseAllowedUsers("51234987:theophile, 1234:pierre")]).toEqual([
			[51234987, "theophile"],
			[1234, "pierre"],
		]);
		expect(() => parseAllowedUsers("abc:x")).toThrow(/not a Telegram user id/);
	});
});

describe("History", () => {
	it("drops a conversation after the idle delay or when it grows too long", () => {
		let now = 0;
		const history = new History(1000, 2, () => now);
		history.set(1, [{ role: "user", content: "a" }]);
		now = 500;
		expect(history.get(1)).toHaveLength(1);
		now = 2000;
		expect(history.get(1)).toEqual([]);
		history.set(1, [
			{ role: "user", content: "a" },
			{ role: "assistant", content: "b" },
			{ role: "user", content: "c" },
		]);
		expect(history.get(1)).toEqual([]);
	});
});

describe("DailyCap", () => {
	it("allows the limit each day", () => {
		let day = "2026-11-04";
		const cap = new DailyCap(2, () => day);
		expect([cap.take(1), cap.take(1), cap.take(1)]).toEqual([
			true,
			true,
			false,
		]);
		expect(cap.take(2)).toBe(true);
		day = "2026-11-05";
		expect(cap.take(1)).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import { frequencyToNote } from "./pitch";

describe("frequencyToNote", () => {
	it("maps concert A to A4 with no deviation", () => {
		const r = frequencyToNote(440);
		expect(r.name).toBe("A");
		expect(r.octave).toBe(4);
		expect(r.cents).toBe(0);
		expect(r.frequency).toBe(440);
	});

	it("maps middle C to C4", () => {
		const r = frequencyToNote(261.63);
		expect(r.name).toBe("C");
		expect(r.octave).toBe(4);
		expect(Math.abs(r.cents)).toBeLessThanOrEqual(1);
	});

	it("maps 880 Hz to A5", () => {
		const r = frequencyToNote(880);
		expect(r.name).toBe("A");
		expect(r.octave).toBe(5);
		expect(r.cents).toBe(0);
	});

	it("reports a sharp reading as positive cents on the same note", () => {
		const r = frequencyToNote(445);
		expect(r.name).toBe("A");
		expect(r.octave).toBe(4);
		expect(r.cents).toBeGreaterThan(0);
		expect(r.cents).toBeLessThan(50);
	});

	it("reports a flat reading as negative cents", () => {
		const r = frequencyToNote(435);
		expect(r.name).toBe("A");
		expect(r.octave).toBe(4);
		expect(r.cents).toBeLessThan(0);
		expect(r.cents).toBeGreaterThan(-50);
	});

	it("detects sharps (C#)", () => {
		// C#4 ≈ 277.18 Hz
		const r = frequencyToNote(277.18);
		expect(r.name).toBe("C#");
		expect(r.octave).toBe(4);
	});

	it("handles low bass frequencies (low E on a guitar, ~82.41 Hz)", () => {
		const r = frequencyToNote(82.41);
		expect(r.name).toBe("E");
		expect(r.octave).toBe(2);
	});
});

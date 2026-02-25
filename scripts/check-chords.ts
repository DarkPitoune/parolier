import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { transpose } from "@tonaljs/chord";
import { fromSemitones } from "@tonaljs/interval";

// Load .env manually
const envPath = resolve(import.meta.dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
	const match = line.match(/^(\w+)=(.*)$/);
	if (match) process.env[match[1]] = match[2];
}

const supabase = createClient(
	process.env.VITE_SUPABASE_URL!,
	process.env.VITE_SUPABASE_ANON_KEY!,
);

const frenchToEnglish: [RegExp, string][] = [
	[/^Sol/, "G"],
	[/^Ré/, "D"],
	[/^La/, "A"],
	[/^Si/, "B"],
	[/^Do/, "C"],
	[/^Mi/, "E"],
	[/^Fa/, "F"],
];

function normalizeFrenchChord(chord: string): string {
	for (const [pattern, replacement] of frenchToEnglish) {
		if (pattern.test(chord)) {
			return chord.replace(pattern, replacement);
		}
	}
	return chord;
}

function transposeLine(chords: string, step: number) {
	const chordsList = chords.split(" ");
	const transposedChords = chordsList.map((chord) =>
		transpose(normalizeFrenchChord(chord), fromSemitones(step)),
	);
	return transposedChords.join(" ");
}

interface Line {
	text: string;
	chords: string;
}

interface Strophe {
	type: "verse" | "chorus" | "bridge" | "section";
	content: Line[] | string;
	repetition?: boolean;
}

async function main() {
	const { data: songs, error } = await supabase
		.from("songs")
		.select("id, title, strophes")
		.order("id");

	if (error) {
		console.error("Failed to fetch songs:", error);
		process.exit(1);
	}

	const step = 1; // transpose up by 1 semitone
	const failedSongs: { id: number; title: string; failedChords: string[] }[] =
		[];

	for (const song of songs) {
		const strophes = song.strophes as Strophe[] | null;
		if (!strophes) continue;

		const failedChords: string[] = [];

		for (const strophe of strophes) {
			if (strophe.type === "section") continue;
			const lines = strophe.content as Line[];
			if (!lines) continue;

			for (const line of lines) {
				if (!line.chords || line.chords.trim() === "") continue;

				const transposed = transposeLine(line.chords, step);
				if (transposed === line.chords) {
					// Transposition had no effect — likely malformed chords
					// Filter out lines that are only empty strings/spaces (no actual chords)
					const hasRealChords = line.chords
						.split(" ")
						.some((c) => c.length > 0);
					if (hasRealChords) {
						failedChords.push(line.chords);
					}
				}
			}
		}

		if (failedChords.length > 0) {
			failedSongs.push({
				id: song.id,
				title: song.title,
				failedChords: [...new Set(failedChords)],
			});
		}
	}

	if (failedSongs.length === 0) {
		console.log("All songs transposed successfully!");
	} else {
		console.log(
			`Found ${failedSongs.length} songs with chord transposition issues:\n`,
		);
		for (const song of failedSongs) {
			console.log(`[${song.id}] ${song.title}`);
			for (const chord of song.failedChords) {
				console.log(`  - "${chord}"`);
			}
			console.log();
		}
	}
}

main();

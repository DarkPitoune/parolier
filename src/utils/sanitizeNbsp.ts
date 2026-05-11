import type { Line, Strophe } from "@/assets/types";

const NBSP = " ";
const KEEP_AFTER = new Set(["!", "?", ";", ":", "»"]);
const KEEP_BEFORE = new Set(["«"]);

// Replace U+00A0 NO-BREAK SPACE with a regular space, EXCEPT where French
// typography requires it: directly before ! ? ; : » or directly after «.
export function sanitizeNbspString(s: string): string {
	if (!s.includes(NBSP)) return s;
	let out = "";
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c !== NBSP) {
			out += c;
			continue;
		}
		if (KEEP_AFTER.has(s[i + 1]) || KEEP_BEFORE.has(s[i - 1])) {
			out += NBSP;
		} else {
			out += " ";
		}
	}
	return out;
}

function sanitizeLine(line: Line): Line {
	const text = sanitizeNbspString(line.text);
	const chords = sanitizeNbspString(line.chords);
	if (text === line.text && chords === line.chords) return line;
	return { ...line, text, chords };
}

export function sanitizeStrophes(strophes: Strophe[]): Strophe[] {
	return strophes.map((strophe) => {
		if (strophe.type === "section") {
			const content = sanitizeNbspString(strophe.content);
			return content === strophe.content ? strophe : { ...strophe, content };
		}
		const content = strophe.content.map(sanitizeLine);
		return { ...strophe, content };
	});
}

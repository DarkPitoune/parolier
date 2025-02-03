import type { Strophe } from "@/assets/types";

export const addChorus = (strophes: Strophe[], apply = true) => {
	if (!apply) return strophes;

	// first, get the chorus
	const chorusIndex = strophes.findIndex((s) => s.type === "chorus");
	if (chorusIndex === -1) return strophes; // no chorus in the song
	const chorus = strophes[chorusIndex];

	const result = chorusIndex === 0 ? [chorus] : [];
	const length = strophes.filter((s) => s.type !== "chorus").length;
	strophes
		.filter((s) => s.type !== "chorus")
		.forEach((strophe, index) => {
			result.push(strophe);
			if (!(strophe.type === "bridge" && index < length - 1))
				// it is NOT a bridge that is in the song
				result.push(chorus);
		});
	return result;
};

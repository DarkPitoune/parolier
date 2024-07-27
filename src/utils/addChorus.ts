import { Strophe } from "../assets/types";

export const addChorus = (strophes: Strophe[], apply: boolean) => {
  if (!apply) return strophes;

  // first, get the chorus
  const chorusIndex = strophes.findIndex((s) => s.type === "chorus");
  if (chorusIndex === -1) return strophes; // no chorus in the song
  const chorus = strophes[chorusIndex];

  const result = chorusIndex === 0 ? [chorus] : [];
  strophes
    .filter((s) => s.type !== "chorus")
    .forEach((strophe) => {
      result.push(strophe);
      result.push(chorus);
    });
  return result;
};

import type { Strophe } from "../assets/types";

/**
 * Assembly responses of the Roman Mass (French, Missel Romain).
 *
 * Only texts that PROMPT recitation from the assembly are included — not what
 * the celebrant says on his own. The ℣ / ℟ convention marks speakers:
 *   ℣ = versicle  (celebrant / prompt)
 *   ℟ = response  (assembly)
 * They are plain text and render as-is today; the viewer can later choose to
 * style ℣ lines dim and ℟ lines bold.
 *
 * `role` maps to the `ordinaire_role` column (French slugs) and lets the future
 * Ordo template pick a default and offer variants (e.g. the two creeds share
 * role "profession_de_foi"). The Gospel acclamation is split into "avant" and
 * "apres" so a reading (lecture) can eventually be inserted between them.
 *
 * These are DRAFTS meant to be corrected against the parish missal.
 */
export interface ResponseSeed {
	title: string;
	role: string;
	strophes: Strophe[];
}

const line = (text: string) => ({ text, chords: "" });
const verse = (...texts: string[]): Strophe => ({
	type: "verse",
	repetition: false,
	content: texts.map(line),
});

export const RESPONSES: ResponseSeed[] = [
	{
		title: "Salutation",
		role: "salutation",
		strophes: [
			verse("℣ Le Seigneur soit avec vous.", "℟ Et avec votre esprit."),
		],
	},
	{
		title: "Préparation pénitentielle — Je confesse",
		role: "acte_penitentiel",
		strophes: [
			verse(
				"Je confesse à Dieu tout-puissant,",
				"je reconnais devant mes frères,",
				"que j'ai péché en pensée, en parole,",
				"par action et par omission ;",
			),
			verse(
				"oui, j'ai vraiment péché.",
				"C'est pourquoi je supplie la bienheureuse Vierge Marie,",
				"les anges et tous les saints,",
				"et vous aussi, mes frères,",
				"de prier pour moi le Seigneur notre Dieu.",
			),
		],
	},
	{
		// Said by the assembly after each reading (1st/2nd). A reading slide can
		// be inserted before this once lectures are supported.
		title: "Parole du Seigneur",
		role: "conclusion_lecture",
		strophes: [verse("℣ Parole du Seigneur.", "℟ Nous rendons grâce à Dieu.")],
	},
	{
		// Displayed just before the Gospel is proclaimed; a reading slide can
		// be inserted after this and before the "après l'Évangile" response.
		title: "Acclamation avant l'Évangile",
		role: "acclamation_evangile_avant",
		strophes: [
			verse(
				"℣ Le Seigneur soit avec vous.",
				"℟ Et avec votre esprit.",
				"℣ Évangile de Jésus Christ selon saint N.",
				"℟ Gloire à toi, Seigneur.",
			),
		],
	},
	{
		title: "Acclamation après l'Évangile",
		role: "acclamation_evangile_apres",
		strophes: [
			verse(
				"℣ Acclamons la Parole de Dieu.",
				"℟ Louange à toi, Seigneur Jésus.",
			),
		],
	},
	{
		title: "Prière sur les offrandes",
		role: "priere_offrandes",
		strophes: [
			verse(
				"℣ Priez, frères et sœurs :",
				"que mon sacrifice, qui est aussi le vôtre,",
				"soit agréable à Dieu le Père tout-puissant.",
			),
			verse(
				"℟ Que le Seigneur reçoive de vos mains ce sacrifice",
				"à la louange et à la gloire de son nom,",
				"pour notre bien et celui de toute l'Église.",
			),
		],
	},
	{
		title: "Dialogue de la préface",
		role: "dialogue_preface",
		strophes: [
			verse(
				"℣ Le Seigneur soit avec vous.",
				"℟ Et avec votre esprit.",
				"℣ Élevons notre cœur.",
				"℟ Nous le tournons vers le Seigneur.",
				"℣ Rendons grâce au Seigneur notre Dieu.",
				"℟ Cela est juste et bon.",
			),
		],
	},
	{
		title: "Anamnèse",
		role: "anamnese",
		strophes: [
			verse(
				"℣ Il est grand, le mystère de la foi :",
				"℟ Nous proclamons ta mort, Seigneur Jésus,",
				"nous célébrons ta résurrection,",
				"nous attendons ta venue dans la gloire.",
			),
		],
	},
	{
		title: "Notre Père",
		role: "notre_pere",
		strophes: [
			verse(
				"Notre Père, qui es aux cieux,",
				"que ton nom soit sanctifié,",
				"que ton règne vienne,",
				"que ta volonté soit faite sur la terre comme au ciel.",
			),
			verse(
				"Donne-nous aujourd'hui notre pain de ce jour.",
				"Pardonne-nous nos offenses,",
				"comme nous pardonnons aussi à ceux qui nous ont offensés.",
				"Et ne nous laisse pas entrer en tentation,",
				"mais délivre-nous du Mal.",
			),
		],
	},
	{
		title: "Doxologie (après le Notre Père)",
		role: "doxologie",
		strophes: [
			verse(
				"Car c'est à toi qu'appartiennent",
				"le règne, la puissance et la gloire",
				"pour les siècles des siècles.",
			),
		],
	},
	{
		title: "Avant la communion",
		role: "communion",
		strophes: [
			verse(
				"Seigneur, je ne suis pas digne de te recevoir ;",
				"mais dis seulement une parole",
				"et je serai guéri.",
			),
		],
	},
	{
		title: "Envoi",
		role: "envoi",
		strophes: [
			verse(
				"℣ Le Seigneur soit avec vous.",
				"℟ Et avec votre esprit.",
				"℣ Allez, dans la paix du Christ.",
				"℟ Nous rendons grâce à Dieu.",
			),
		],
	},
	{
		title: "Symbole des Apôtres",
		role: "profession_de_foi",
		strophes: [
			verse(
				"Je crois en Dieu, le Père tout-puissant,",
				"créateur du ciel et de la terre ;",
				"et en Jésus Christ, son Fils unique, notre Seigneur,",
				"qui a été conçu du Saint-Esprit,",
				"est né de la Vierge Marie,",
			),
			verse(
				"a souffert sous Ponce Pilate,",
				"a été crucifié, est mort et a été enseveli,",
				"est descendu aux enfers,",
				"le troisième jour est ressuscité des morts,",
				"est monté aux cieux,",
				"est assis à la droite de Dieu le Père tout-puissant,",
				"d'où il viendra juger les vivants et les morts.",
			),
			verse(
				"Je crois en l'Esprit Saint,",
				"à la sainte Église catholique,",
				"à la communion des saints,",
				"à la rémission des péchés,",
				"à la résurrection de la chair,",
				"à la vie éternelle. Amen.",
			),
		],
	},
	{
		title: "Symbole de Nicée-Constantinople",
		role: "profession_de_foi",
		strophes: [
			verse(
				"Je crois en un seul Dieu, le Père tout-puissant,",
				"créateur du ciel et de la terre,",
				"de l'univers visible et invisible.",
				"Je crois en un seul Seigneur, Jésus Christ,",
				"le Fils unique de Dieu, né du Père avant tous les siècles :",
			),
			verse(
				"il est Dieu, né de Dieu, lumière, née de la lumière,",
				"vrai Dieu, né du vrai Dieu,",
				"engendré, non pas créé, consubstantiel au Père ;",
				"et par lui tout a été fait.",
				"Pour nous les hommes, et pour notre salut,",
				"il descendit du ciel ;",
			),
			verse(
				"par l'Esprit Saint, il a pris chair de la Vierge Marie,",
				"et s'est fait homme.",
				"Crucifié pour nous sous Ponce Pilate,",
				"il souffrit sa passion et fut mis au tombeau.",
				"Il ressuscita le troisième jour,",
				"conformément aux Écritures,",
				"et il monta au ciel ;",
				"il est assis à la droite du Père.",
			),
			verse(
				"Il reviendra dans la gloire, pour juger les vivants et les morts ;",
				"et son règne n'aura pas de fin.",
				"Je crois en l'Esprit Saint, qui est Seigneur et qui donne la vie ;",
				"il procède du Père et du Fils.",
				"Avec le Père et le Fils, il reçoit même adoration et même gloire ;",
				"il a parlé par les prophètes.",
			),
			verse(
				"Je crois en l'Église, une, sainte, catholique et apostolique.",
				"Je reconnais un seul baptême pour le pardon des péchés.",
				"J'attends la résurrection des morts,",
				"et la vie du monde à venir. Amen.",
			),
		],
	},
];

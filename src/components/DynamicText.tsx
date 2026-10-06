import clsx from "clsx";
import { useAtomValue } from "jotai";
import { fontSizeAtom } from "./Contexts/SettingsContext";

const fontSizeTailwind = [
	"text-xs",
	"text-sm",
	"text-base",
	"text-lg",
	"text-xl",
	"text-2xl",
	"text-3xl",
	"text-4xl",
	"text-5xl",
	"text-6xl",
];

type DynamicTextProps = {
	text: string;
	className?: string;
};

//Le but est ici de remplacer les espaces avant les ponctuations par des espaces insécables, pour éviter d'avoir une ponctuation toute seule sur une ligne. On fait de même pour les guillemets français, mais dans l'autre sens (espace insécable après les guillemets ouvrants, et avant les guillemets fermants)
const withNonBreakingSpaces = (text: string) =>
	text.replace(/ ([?!:;»])/g, "\u00A0$1").replace(/([«]) /g, "$1\u00A0");

function DynamicText({ text, className }: DynamicTextProps) {
	const fontSize = useAtomValue(fontSizeAtom);

	return (
		<p className={clsx(fontSizeTailwind[fontSize], className)}>
			{withNonBreakingSpaces(text)}
		</p>
	);
}

export { DynamicText, withNonBreakingSpaces };

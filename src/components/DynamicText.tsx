import clsx from "clsx";
import { fontSizeAtom } from "./SettingsContext";
import { useAtomValue } from "jotai";

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

function DynamicText({ text, className }: DynamicTextProps) {
	const fontSize = useAtomValue(fontSizeAtom);

	return <p className={clsx(fontSizeTailwind[fontSize], className)}>{text}</p>;
}

export { DynamicText };

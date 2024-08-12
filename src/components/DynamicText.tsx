import clsx from "clsx";
import { useContext } from "react";
import { SettingsContext } from "./SettingsContext";

const fontSizeTailwind = [
	"text-xs",
	"text-sm",
	"text-base",
	"text-md",
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
	const [settings] = useContext(SettingsContext);

	if (!settings) {
		return <p>Loading...</p>;
	}

	const fontSizeClass = fontSizeTailwind[settings.fontSize];

	return <p className={clsx(fontSizeClass, className)}>{text}</p>;
}

export default DynamicText;

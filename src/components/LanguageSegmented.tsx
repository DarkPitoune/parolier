import type { SongLanguage } from "@/assets/types";
import {
	type SegmentedOption,
	SettingSegmented,
} from "./SidePanel/variants/SettingsSidePanel/SettingsControls";

const flag = (emoji: string) => (
	<span aria-hidden="true" className="text-lg leading-none">
		{emoji}
	</span>
);

const LANGUAGE_OPTIONS: SegmentedOption<SongLanguage>[] = [
	{ value: "fr", label: "Français", icon: flag("🇫🇷") },
	{ value: "en", label: "English", icon: flag("🇬🇧") },
];

export function LanguageSegmented({
	value,
	onChange,
}: {
	value: SongLanguage;
	onChange: (value: SongLanguage) => void;
}) {
	return (
		<SettingSegmented
			value={value}
			options={LANGUAGE_OPTIONS}
			onChange={onChange}
		/>
	);
}

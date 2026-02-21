import { CogIcon } from "@heroicons/react/24/solid";
import { useAtom } from "jotai";
import { settingsOpenAtom } from "./Contexts/SettingsContext";

export const CornerMenu = () => {
	const [settingsOpened, setSettingsOpened] = useAtom(settingsOpenAtom);

	return (
		<button
			onClick={() => setSettingsOpened(!settingsOpened)}
			type="button"
			className="fixed -bottom-3 -right-3 z-10 print:hidden size-14 rounded-full bg-gray-500 flex items-center justify-center"
		>
			<CogIcon color="white" className="size-8 -translate-x-0.5 -translate-y-0.5" />
		</button>
	);
};

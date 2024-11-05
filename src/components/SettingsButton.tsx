import { CogIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { settingsOpenedAtom } from "./Contexts/SettingsContext";
import { useAtom } from "jotai";

const SettingsButton = ({ isExpanded }: { isExpanded: boolean }) => {
	const [settingsOpened, setSettingsOpened] = useAtom(settingsOpenedAtom);

	return (
		<button
			onClick={() => {
				setSettingsOpened(!settingsOpened);
			}}
			type="button"
			className={clsx(
				" bg-gray-500 absolute z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center",
				isExpanded ? "-left-[3.5rem] -top-[3.5rem]" : "left-2 top-2",
			)}
		>
			<CogIcon color="white" className="size-8" />
		</button>
	);
};

export { SettingsButton };

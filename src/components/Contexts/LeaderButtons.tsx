import { NoSymbolIcon } from "@heroicons/react/24/outline";
import { RssIcon } from "@heroicons/react/24/solid";
import { useLeader } from "./LeaderContext";

const TakeLeadButton = ({ username }: { username: string }) => {
	const { takeLead } = useLeader();
	return (
		<button
			onClick={() => takeLead(username)}
			type="button"
			className=" bg-jubilateBlue-500 dark:bg-jubilateBlue-400 size-12 rounded-full flex items-center justify-center place-self-center"
		>
			<RssIcon color="white" className="size-8" />
		</button>
	);
};

const DropLeadButton = () => {
	const dropLead = () => {}; // Aucune idée de ce qu'il faut faire ici... Désolé
	return (
		<button
			data-tooltip-target="Cesser le partage"
			data-tooltip-placement="top"
			onClick={dropLead}
			type="button"
			className="bg-jubilateRed size-12 rounded-full flex items-center justify-center place-self-center"
		>
			<NoSymbolIcon color="white" className="size-8" />
		</button>
	);
};

export { TakeLeadButton, DropLeadButton };

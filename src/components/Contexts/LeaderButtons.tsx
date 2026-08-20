import { NoSymbolIcon } from "@heroicons/react/24/outline";
import { RssIcon } from "@heroicons/react/24/solid";

const TakeLeadButton = () => (
	<div className=" bg-jubilateBlue-500 dark:bg-jubilateBlue-400 size-12 rounded-full flex items-center justify-center place-self-center">
		<RssIcon color="white" className="size-8" />
	</div>
);

const DropLeadButton = () => (
	<div
		data-tooltip-target="Cesser le partage"
		data-tooltip-placement="top"
		className="bg-jubilateRed-400 size-12 rounded-full flex items-center justify-center place-self-center"
	>
		<NoSymbolIcon color="white" className="size-8" />
	</div>
);

export { TakeLeadButton, DropLeadButton };

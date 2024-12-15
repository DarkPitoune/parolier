import {
	Description,
	Dialog,
	DialogPanel,
	DialogTitle,
} from "@headlessui/react";
import { NoSymbolIcon, UsersIcon } from "@heroicons/react/24/outline";
import { RssIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { useLeader } from "./LeaderContext";
import { darkModeAtom } from "./SettingsContext";

const TakeLeadButton = () => {
	const { takeLead } = useLeader();
	return (
		<button
			onClick={takeLead}
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

const FollowButton = ({ isExpanded }: { isExpanded: boolean }) => {
	const { follow } = useLeader();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const darkMode = useAtomValue(darkModeAtom);
	const getFollow = () => {
		// setIsDialogOpen(true);
		const name = window.prompt("Entrez le nom de la session à suivre");
		if (name) follow(name);
	};
	return (
		<>
			<Dialog
				open={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				className={clsx("relative z-50", darkMode ? "dark" : "light")}
			>
				<div className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/50">
					<DialogPanel className="max-w-lg space-y-4 bg-white dark:bg-gray-800 p-12 rounded-xl">
						<DialogTitle className="font-bold">
							Suivre une session live
						</DialogTitle>
						<Description>Choisissez une session à suivre</Description>
					</DialogPanel>
				</div>
			</Dialog>
			<button
				onClick={getFollow}
				type="button"
				className={clsx(
					"absolute ease-in-out z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center bg-jubilateRed",
					isExpanded ? "-top-[3.5rem] -right-[3.5rem]" : "right-2 top-2",
				)}
			>
				<UsersIcon color="white" className="size-8" />
			</button>
		</>
	);
};

export { TakeLeadButton, FollowButton, DropLeadButton };

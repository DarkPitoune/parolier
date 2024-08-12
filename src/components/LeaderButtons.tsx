import { UsersIcon } from "@heroicons/react/24/outline";
import { RssIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useLeader } from "./LeaderContext";

const TakeLeadButton = ({ isExpanded }: { isExpanded: boolean }) => {
	const { takeLead } = useLeader();
	return (
		<button
			onClick={takeLead}
			type="button"
			className={clsx(
				"bg-red-500 absolute z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center",
				isExpanded ? "-left-[3.5rem] -top-[3.5rem]" : "left-2 top-2",
			)}
		>
			<RssIcon color="white" className="size-8" />
		</button>
	);
};

const FollowButton = ({ isExpanded }: { isExpanded: boolean }) => {
	const { follow } = useLeader();
	const getFollow = () => {
		const name = window.prompt("Qui suivre ?");
		if (name) follow(name);
	};
	return (
		<button
			onClick={getFollow}
			type="button"
			className={clsx(
				"absolute ease-in-out z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center bg-red-500",
				isExpanded ? "-top-20" : "left-2 top-2",
			)}
		>
			<UsersIcon color="white" className="size-8" />
		</button>
	);
};

export { TakeLeadButton, FollowButton };

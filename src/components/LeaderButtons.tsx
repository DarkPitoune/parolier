import { RssIcon } from "@heroicons/react/24/solid";
import { useLeader } from "./LeaderContext";
import { UsersIcon } from "@heroicons/react/24/outline";

const TakeLeadButton = ({ isExpanded }: { isExpanded: boolean }) => {
  const { takeLead } = useLeader();
  return (
    <button
      onClick={takeLead}
      className={`bg-red-500 absolute ${
        isExpanded ? "-left-[3.5rem] -top-[3.5rem]" : "left-2 top-2"
      } z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center`}
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
      className={`absolute ${
        isExpanded ? "-top-20" : "left-2 top-2"
      } ease-in-out z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center bg-red-500`}
    >
      <UsersIcon color="white" className="size-8" />
    </button>
  );
};

export { TakeLeadButton, FollowButton };

import { type AllSetlists, allSetlistsQuery } from "@/utils/supabase";
import { ChevronLeftIcon } from "@heroicons/react/16/solid";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Setlists = () => {
	const [setslists, setSetlists] = useState<AllSetlists>([]);

	useEffect(() => {
		allSetlistsQuery().then(({ data }) => setSetlists(data || []));
	}, []);

	return (
		<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
			<div className="bg-jubilateBlue-500 dark:bg-slate-900 px-6 py-4 flex justify-between items-center">
				<Link
					className="bg-jubilateBlue-500 dark:bg-jubilateBlue-400 rounded-full hover:bg-jubilateBlue-700"
					to="/"
				>
					<ChevronLeftIcon className="w-10 dark:fill-gray-800 fill-white" />
				</Link>
				<img className="h-12" src="/svg/logo.svg" alt="Logo" />
			</div>
			<div className="divide-y">
				{setslists?.map((setlist) => (
					<Link
						key={setlist.id}
						className="px-2 py-4  flex items-stretch gap-3 text-black dark:text-white hover:bg-jubilateBlue-100 dark:hover:bg-gray-700"
						to={`/setlists/${setlist.id}`}
					>
						{setlist.name}
					</Link>
				))}
			</div>
		</div>
	);
};

export { Setlists };

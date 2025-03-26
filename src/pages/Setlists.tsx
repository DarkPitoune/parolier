import { type AllSetlists, allSetlistsQuery } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Setlists = () => {
	const [setslists, setSetlists] = useState<AllSetlists>([]);

	useEffect(() => {
		allSetlistsQuery().then(({ data }) => setSetlists(data || []));
	}, []);

	return (
		<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
			<div className="bg-jubilateBlue-500 dark:bg-slate-900 px-6 py-4 gap-4 flex justify-end items-center">
				<img className="h-12" src="/svg/logo.svg" alt="Logo" />
			</div>
			<div>
				{setslists?.map((setlist) => (
					<div
						key={setlist.id}
						className="flex p-4 bg-gray-100 dark:bg-gray-800"
					>
						<Link
							to={`/setlists/${setlist.id}/edit`}
							className="text-xl font-bold flex-1"
						>
							{setlist.name}
						</Link>
						<Link to={`/setlists/${setlist.id}/steps/0`} className="text-lg">
							Lancer
						</Link>
					</div>
				))}
			</div>
		</div>
	);
};

export { Setlists };

import { type AllSetlists, allSetlistsQuery } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Setlists = () => {
	const [setslists, setSetlists] = useState<AllSetlists>([]);

	useEffect(() => {
		allSetlistsQuery().then(({ data }) => setSetlists(data || []));
	}, []);

	return (
		<div className="bg-white dark:bg-gray-800">
			<div className="bg-jubilateBlue-500 dark:bg-slate-900 px-6 py-4 gap-4 flex justify-end items-center">
				<img className="h-12" src="/svg/logo.svg" alt="Logo" />
			</div>
			<div className={"w-screen h-screen"}>
				<div>
					{setslists?.map((setlist) => (
						<div key={setlist.id} className="p-4 bg-gray-100 dark:bg-gray-800">
							<Link
								to={`/setlists/${setlist.id}/edit`}
								className="text-xl font-bold"
							>
								{setlist.name}
							</Link>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export { Setlists };

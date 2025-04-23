import {
	type AllSetlists,
	allSetlistsQuery,
	deleteSetlistMutation,
	newSetlistMutation,
} from "@/utils/supabase";
import { ChevronLeftIcon } from "@heroicons/react/16/solid";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type RightClickMenuPosition = {
	setListId: number;
	x: number;
	y: number;
};

const Setlists = () => {
	const [setslists, setSetlists] = useState<AllSetlists>([]);

	const fetchSetlists = useCallback(async () => {
		const { data } = await allSetlistsQuery();
		setSetlists(data || []);
	}, []);

	const handleCreateSetlist = () => {
		newSetlistMutation().then(fetchSetlists);
	};

	useEffect(() => {
		fetchSetlists();
	}, [fetchSetlists]);

	const rightClickMenuRef = useRef<HTMLDivElement>(null);
	const [rightClickMenuPosition, setRightClickMenuPosition] =
		useState<RightClickMenuPosition | null>(null);

	const handleOnContextMenu = (
		e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
		setListId: number,
	) => {
		e.preventDefault();
		e.stopPropagation();

		setRightClickMenuPosition({
			setListId,
			x: e.clientX,
			y: e.clientY + window.pageYOffset,
		});
	};

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				rightClickMenuRef.current &&
				!rightClickMenuRef.current.contains(e.target as Node)
			) {
				setRightClickMenuPosition(null);
			}
		};

		document.addEventListener("click", handleClick);
		return () => {
			document.removeEventListener("click", handleClick);
		};
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
				<h1 className="font-flame text-xl lg:text-3xl text-white">Setlists</h1>
				<img className="h-12" src="/svg/logo.svg" alt="Logo" />
			</div>
			<div className="flex flex-col items-stretch divide-y">
				{setslists?.map((setlist) => (
					<Link
						onContextMenu={(e) => handleOnContextMenu(e, setlist.id)}
						key={setlist.id}
						className="px-2 py-4 flex items-stretch gap-3 text-black dark:text-white hover:bg-jubilateBlue-100 dark:hover:bg-gray-700"
						to={`/setlists/${setlist.id}`}
					>
						{setlist.name}
					</Link>
				))}
				<button
					type="button"
					onClick={handleCreateSetlist}
					className="px-2 py-2 dark:text-slate-700 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 italic text-slate-400"
				>
					Créer une setlist
				</button>
			</div>
			{rightClickMenuPosition && (
				<div
					ref={rightClickMenuRef}
					style={{
						position: "absolute",
						left: rightClickMenuPosition.x,
						top: rightClickMenuPosition.y,
					}}
					className="rounded-md bg-gray-200 dark:bg-slate-900 p-1 flex flex-col gap-1"
				>
					<p className="text-sm italic px-1">Actions administrateur</p>
					<Link
						to={`/setlists/${rightClickMenuPosition.setListId}/edit`}
						className="px-2 py-1 text-black dark:text-white dark:hover:bg-slate-700 bg-white hover:bg-slate-200 dark:bg-slate-800 rounded-md transition"
					>
						Modifier la setlist
					</Link>
					<button
						type="button"
						className="px-2 py-1 text-black dark:text-white dark:hover:bg-slate-700 bg-white hover:bg-slate-200 dark:bg-slate-800 rounded-md transition"
						onClick={() => {
							deleteSetlistMutation(rightClickMenuPosition.setListId).then(
								fetchSetlists,
							);
							setRightClickMenuPosition(null);
						}}
					>
						Supprimer la setlist
					</button>
				</div>
			)}
		</div>
	);
};

export { Setlists };

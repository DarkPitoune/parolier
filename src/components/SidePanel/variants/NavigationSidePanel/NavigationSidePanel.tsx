import { newSongMutation } from "@/utils/supabase";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { SidePanel } from "../../SidePanel";

export function NavigationSidePanel({
	open,
	setOpen,
}: { open: boolean; setOpen: (open: boolean) => void }) {
	const navigate = useNavigate();
	const createNewSong = async () => {
		const title = prompt("Titre de la chanson");
		if (!title) return;
		const { error, data } = await newSongMutation(title);
		if (error) {
			toast.error(`Erreur lors de la création de la chanson: ${error.message}`);
		} else {
			toast.success("Chanson créée avec succès");
			navigate(`/songs/${data.id}`);
		}
	};
	return (
		<SidePanel open={open} onClose={() => setOpen(false)} title="Navigation">
			<Link
				className="text-center py-2 rounded hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
				to="/setlists"
			>
				Setlists
			</Link>
			<Link
				className="text-center py-2 rounded hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
				to="/analytics"
			>
				Statistiques
			</Link>
			<Link
				className="text-center py-2 rounded hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
				to="/presenter"
			>
				Mode Présentateur
			</Link>
			<button
				className="text-center py-2 rounded hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
				type="button"
				onClick={createNewSong}
			>
				Nouvelle chanson
			</button>
		</SidePanel>
	);
}

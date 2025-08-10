import { Link } from "react-router-dom";
import { SidePanel } from "../../SidePanel";
import { newSongMutation } from "@/utils/supabase";
import toast from "react-hot-toast";

export function NavigationSidePanel({
	open,
	setOpen,
}: { open: boolean; setOpen: (open: boolean) => void }) {
	const createNewSong = async () => {
		const title = prompt("Titre de la chanson");
		if (!title) return;
		const { error } = await newSongMutation(title);
		if (error) {
			toast.error(`Erreur lors de la création de la chanson: ${error.message}`);
		}
		else {
			toast.success("Chanson créée avec succès");
			window.location.reload();
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

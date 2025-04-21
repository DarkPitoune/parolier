import { Link } from "react-router-dom";
import { SidePanel } from "../../SidePanel";

export function NavigationSidePanel({
	open,
	setOpen,
}: { open: boolean; setOpen: (open: boolean) => void }) {
	return (
		<SidePanel open={open} onClose={() => setOpen(false)} title="Navigation">
			<Link
				className="text-center py-2 rounded hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 transition"
				to="/setlists"
			>
				Setlists
			</Link>
		</SidePanel>
	);
}

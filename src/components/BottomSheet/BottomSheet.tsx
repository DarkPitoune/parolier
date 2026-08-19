import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	DialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { isDarkAtom } from "../Contexts/SettingsContext";

type BottomSheetProps = {
	open: boolean;
	onClose: () => void;
	title?: string;
	header?: ReactNode;
	children: ReactNode;
};

/**
 * Sibling of SidePanel rather than a `side` prop on it: SidePanel is the global
 * settings panel reachable from every page, and its geometry is spread across
 * several className strings — forking them would risk a global regression for
 * no gain here.
 */
function BottomSheet({
	open,
	onClose,
	title,
	header,
	children,
}: BottomSheetProps) {
	const darkMode = useAtomValue(isDarkAtom);

	return (
		<Dialog
			open={open}
			onClose={onClose}
			// The `dark` class has to sit on an ancestor: index.css defines the
			// variant as `&:is(.dark *)`, so putting it on the panel would leave
			// the panel's own dark: classes inert while its children styled fine.
			// z-20 clears PageHeader and SidePanel, both z-10.
			className={clsx("relative z-20", darkMode && "dark")}
		>
			<DialogBackdrop
				transition
				className="fixed inset-0 bg-jubilateBlue-300/40 transition duration-200 ease-in-out data-closed:opacity-0"
			/>
			<div className="fixed inset-x-0 bottom-0 flex">
				<DialogPanel
					transition
					className="w-full transform transition duration-200 ease-in-out data-closed:translate-y-full"
				>
					<div className="flex flex-col gap-4 rounded-t-2xl bg-white dark:bg-gray-800 text-black dark:text-white px-4 pt-4 pb-6 shadow-xl max-h-[85dvh] overflow-y-auto">
						{header ??
							(title ? (
								<DialogTitle className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
									{title}
								</DialogTitle>
							) : null)}
						{children}
					</div>
				</DialogPanel>
			</div>
		</Dialog>
	);
}

export { BottomSheet };

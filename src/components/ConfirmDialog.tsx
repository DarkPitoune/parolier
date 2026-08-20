import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	DialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { isDarkAtom } from "./Contexts/SettingsContext";

type ConfirmDialogProps = {
	open: boolean;
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = "Confirmer",
	cancelLabel = "Annuler",
	danger = true,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const darkMode = useAtomValue(isDarkAtom);

	return (
		<Dialog
			open={open}
			onClose={onCancel}
			className={clsx("relative z-20", darkMode && "dark")}
		>
			<DialogBackdrop
				transition
				className="fixed inset-0 bg-jubilateBlue-300/40 transition duration-200 ease-in-out data-closed:opacity-0"
			/>
			<div className="fixed inset-0 flex items-center justify-center p-4">
				<DialogPanel
					transition
					className="w-full max-w-sm transform transition duration-200 ease-in-out data-closed:opacity-0 data-closed:scale-95"
				>
					<div className="flex flex-col gap-4 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white p-6 shadow-xl">
						<DialogTitle className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
							{title}
						</DialogTitle>
						{message && (
							<p className="text-sm text-gray-600 dark:text-gray-300">
								{message}
							</p>
						)}
						<div className="flex gap-2 justify-end">
							<button
								type="button"
								onClick={onCancel}
								className="px-4 py-2 rounded-full text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
							>
								{cancelLabel}
							</button>
							<button
								type="button"
								onClick={onConfirm}
								className={clsx(
									"px-4 py-2 rounded-full text-white transition",
									danger
										? "bg-jubilateRed-500 hover:bg-jubilateRed-400"
										: "bg-jubilateBlue-500 hover:bg-jubilateBlue-600 dark:bg-jubilateBlue-400 dark:hover:bg-jubilateBlue-300",
								)}
							>
								{confirmLabel}
							</button>
						</div>
					</div>
				</DialogPanel>
			</div>
		</Dialog>
	);
}

export { ConfirmDialog };

import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	DialogTitle,
} from "@headlessui/react";
import { MinusIcon, PlusIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useContext } from "react";
import DynamicText from "../DynamicText";
import { SettingsContext } from "../SettingsContext";
import { ResetIcon } from "./ResetIcon";

function SidePanel({
	open,
	setOpen,
	tonality,
	setTonality,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
	tonality: number;
	setTonality: (newT: number) => void;
}) {
	const [settings, setSettings] = useContext(SettingsContext);

	function handleFontChange(increment: number) {
		if (!settings) return;
		setSettings({
			...settings,
			fontSize: increment === 0 ? 2 : settings.fontSize + increment,
		});
	}

	return (
		<Dialog
			open={open}
			onClose={setOpen}
			className={clsx("relative z-10", settings.darkMode && "dark")}
		>
			<DialogBackdrop
				transition
				className="fixed inset-0 bg-jubilateBlue-300 bg-opacity-75 transition-opacity duration-500 ease-in-out data-[closed]:opacity-0"
			/>

			<div className="fixed inset-0 overflow-hidden">
				<div className="absolute inset-0 overflow-hidden">
					<div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-24">
						<DialogPanel
							transition
							className="pointer-events-auto relative w-screen max-w-md transform transition duration-500 ease-in-out data-[closed]:translate-x-full sm:duration-700"
						>
							<div className="flex h-full gap-6 flex-col overflow-y-scroll bg-white dark:bg-gray-800 py-6 shadow-xl px-4 sm:px-6">
								<DialogTitle className="text-5xl font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400">
									Préférences
								</DialogTitle>
								<div className="flex flex-col gap-2">
									<div className="flex justify-between">
										<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
											Police
										</h1>
										<div className="flex gap-4">
											<button
												onClick={() => handleFontChange(-1)}
												type="button"
											>
												<MinusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
											</button>
											<button onClick={() => handleFontChange(1)} type="button">
												<PlusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
											</button>
											<button onClick={() => handleFontChange(0)} type="button">
												<ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
											</button>
										</div>
									</div>
									<DynamicText
										text="Ceci est un texte"
										className="dark:text-white text-center"
									/>
								</div>

								<div className="flex justify-between gap-4">
									<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
										Accords
									</h1>

									<input
										id="chordsCheckbox"
										type="checkbox"
										checked={settings.showChords}
										onChange={(e) => {
											setSettings({
												...settings,
												showChords: e.target.checked,
											});
										}}
										className="w-5 h-5 accent-jubilateBlue-500 dark:accent-jubilateBlue-400 rounded-2xl"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<div className="flex justify-between">
										<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
											Transposer
										</h1>
										<div className="flex gap-4">
											<button
												onClick={() => setTonality(tonality - 1)}
												type="button"
											>
												<MinusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
											</button>
											<button
												onClick={() => setTonality(tonality + 1)}
												type="button"
											>
												<PlusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
											</button>
											<button
												onClick={() => {
													setTonality(0);
												}}
												type="button"
											>
												<ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
											</button>
										</div>
									</div>
									<DynamicText
										text={tonality.toString()}
										className="dark:text-white text-center"
									/>
								</div>

								<div className="flex items-center justify-between gap-4">
									<h1 className="font-flame text-2xl  text-jubilateBlue-500 dark:text-jubilateBlue-400">
										Refrains
									</h1>

									<input
										id="chordsCheckbox"
										type="checkbox"
										checked={settings.addChorus}
										onChange={(e) => {
											setSettings({
												...settings,
												addChorus: e.target.checked,
											});
										}}
										className="size-5 rounded-2xl accent-jubilateBlue-500 dark:accent-jubilateBlue-400"
									/>
								</div>

								<div className="flex gap-4 items-baseline justify-between">
									<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
										Mode Sombre
									</h1>
									<input
										id="chordsCheckbox"
										type="checkbox"
										checked={settings.darkMode}
										onChange={(e) => {
											setSettings({
												...settings,
												darkMode: e.target.checked,
											});
										}}
										className="size-5 rounded-2xl accent-jubilateBlue-500 dark:accent-jubilateBlue-400"
									/>
								</div>
								<div className="flex gap-4 items-baseline justify-between">
									<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
										Pseudo
									</h1>
									<input
										id="username"
										type="text"
										onChange={(e) => {
											setSettings({
												...settings,
												username: e.target.value,
											});
										}}
										value={settings.username}
										className="rounded-2xl px-4 accent-jubilateBlue-500 dark:accent-jubilateBlue-400"
									/>
								</div>
							</div>
						</DialogPanel>
					</div>
				</div>
			</div>
		</Dialog>
	);
}

export { SidePanel };

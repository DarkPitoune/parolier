import clsx from "clsx";
import { type ReactNode, createContext, useEffect, useState } from "react";
import type { Settings } from "../assets/types";

const initialSettings: Settings = {
	fontSize: 2,
	showChords: true,
	addChorus: false,
	darkMode: false,
	username: navigator.platform, // deprecated but idc
};

const SettingsContext = createContext<
	[Settings, (newSettings: Settings) => void]
>([initialSettings, () => {}]);

function SettingsContextProvider({ children }: { children: ReactNode }) {
	const [settings, setSettings] = useState<Settings>(initialSettings);

	const handleNewSettings = (newSettings: Settings) => {
		// Validate values
		if (newSettings.fontSize < 0) {
			// stop saying you have good eyes
			newSettings.fontSize = 0;
		}
		if (newSettings.fontSize > 10) {
			// go get better googles
			newSettings.fontSize = 10;
		}

		setSettings(newSettings);

		// Save values
		localStorage.setItem("settings.fontSize", newSettings.fontSize.toString());
		localStorage.setItem(
			"settings.showChords",
			newSettings.showChords ? "true" : "false",
		);
		localStorage.setItem(
			"settings.addChorus",
			newSettings.addChorus ? "true" : "false",
		);
		localStorage.setItem(
			"settings.darkMode",
			newSettings.darkMode ? "true" : "false",
		);
		localStorage.setItem("settings.username", newSettings.username);
	};

	useEffect(() => {
		const fontSize = Number.isNaN(
			Number.parseInt(localStorage.getItem("settings.fontSize") || ""),
		)
			? initialSettings.fontSize
			: Number.parseInt(localStorage.getItem("settings.fontSize") || "");
		const showChords = localStorage.getItem("settings.showChords") === "true";
		const addChorus = localStorage.getItem("settings.addChorus") === "true";
		const darkMode = localStorage.getItem("settings.darkMode") === "true";
		const username = localStorage.getItem("settings.username") || "";
		setSettings({
			fontSize,
			showChords,
			addChorus,
			darkMode,
			username,
		});
	}, []);

	return (
		<SettingsContext.Provider value={[settings, handleNewSettings]}>
			<div
				className={clsx(
					settings.darkMode ? "dark bg-gray-800" : "bg-white",
					"min-h-screen",
				)}
			>
				{children}
			</div>
		</SettingsContext.Provider>
	);
}

export { SettingsContextProvider, SettingsContext };

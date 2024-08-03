import { createContext, ReactNode, useEffect, useState } from "react";
import { Settings } from "./assets/types";

const initialSettings: Settings = {
  fontSize: 2,
  showChords: true,
  addChorus: false,
  darkMode: false,
};

const SettingsContext = createContext<
  [Settings, (newSettings: Settings) => void]
>([initialSettings, () => {}]);

function SettingsContextProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);

  const handleNewSettings = (newSettings: Settings) => {
    if (newSettings.fontSize < 0) {
      // stop saying you have good eyes
      newSettings.fontSize = 0;
    }
    if (newSettings.fontSize > 10) {
      // go get better googles
      newSettings.fontSize = 10;
    }

    setSettings(newSettings);
    localStorage.setItem("settings.fontSize", "" + newSettings.fontSize);
    localStorage.setItem(
      "settings.showChords",
      newSettings.showChords ? "true" : "false"
    );
    localStorage.setItem(
      "settings.addChorus",
      newSettings.addChorus ? "true" : "false"
    );
    localStorage.setItem(
      "settings.darkMode",
      newSettings.darkMode ? "true" : "false"
    );
  };

  useEffect(() => {
    const fontSize = isNaN(
      parseInt(localStorage.getItem("settings.fontSize") || "")
    )
      ? initialSettings.fontSize
      : parseInt(localStorage.getItem("settings.fontSize") || "");
    const showChords = localStorage.getItem("settings.showChords") === "true";
    const addChorus = localStorage.getItem("settings.addChorus") === "true";
    const darkMode = localStorage.getItem("settings.darkMode") === "true";
    setSettings({
      fontSize,
      showChords,
      addChorus,
      darkMode,
    });
  }, []);

  return (
    <SettingsContext.Provider value={[settings, handleNewSettings]}>
      {children}
    </SettingsContext.Provider>
  );
}

export { SettingsContextProvider, SettingsContext };

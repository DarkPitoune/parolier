import { createContext, ReactNode, useEffect, useState } from "react";
import { Settings } from "./assets/types";

const SettingsContext = createContext<
  [Settings | null, (newSettings: Settings) => void]
>([null, () => {}]);

function SettingsContextProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  const refresh = (newSettings: Settings) => {
    if (newSettings.fontSize < 0) {
      // stop saying you have good eyes
      newSettings.fontSize = 0;
    }
    if (newSettings.fontSize > 10) {
      // go get better googles
      newSettings.fontSize = 10;
    }
    setSettings(newSettings);
  };

  useEffect(() => {
    const initialSettings: Settings = {
      fontSize: 2,
      showChords: true,
    };
    setSettings(initialSettings);
  }, []);

  return (
    <SettingsContext.Provider value={[settings, refresh]}>
      {children}
    </SettingsContext.Provider>
  );
}

export { SettingsContextProvider, SettingsContext };

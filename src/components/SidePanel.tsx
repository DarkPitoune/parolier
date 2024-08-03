"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import DynamicText from "./DynamicText";
import { PlusIcon } from "../svg components/PlusIcon";
import { SettingsContext } from "../SettingsContextProvider";
import { useContext } from "react";
import { MinusIcon } from "../svg components/MinusIcon";
import { ResetIcon } from "../svg components/ResetIcon";

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
      fontSize:
        increment === 0
          ? (settings.fontSize = 2)
          : settings.fontSize + increment,
    });
  }

  return (
    <Dialog open={open} onClose={setOpen} className="relative z-10">
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
              <div className="flex h-full flex-col overflow-y-scroll bg-white dark:bg-gray-800 py-6 shadow-xl">
                <div className="px-4 sm:px-6">
                  <DialogTitle className="text-5xl font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400">
                    Préférences
                  </DialogTitle>
                </div>
                <div className="relative mt-6 flex-1 px-4 mr-1 sm:px-6 flex flex-col gap-6">
                  <div className="flex flex-col">
                    <div className="flex justify-between">
                      <h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
                        Police
                      </h1>
                      <div className="flex gap-4">
                        <button onClick={() => handleFontChange(-1)}>
                          <MinusIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
                        </button>
                        <button onClick={() => handleFontChange(1)}>
                          <PlusIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
                        </button>
                        <button onClick={() => handleFontChange(0)}>
                          <ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
                        </button>
                      </div>
                    </div>
                    <DynamicText
                      text="Ceci est un texte"
                      className="place-self-center pt-2 dark:text-white"
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
                  <div className="flex flex-col">
                    <div className="flex justify-between">
                      <h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
                        Transposer
                      </h1>
                      <div className="flex gap-4">
                        <button onClick={() => setTonality(tonality - 1)}>
                          <MinusIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
                        </button>
                        <button onClick={() => setTonality(tonality + 1)}>
                          <PlusIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
                        </button>
                        <button
                          onClick={() => {
                            setTonality(0);
                          }}
                        >
                          <ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
                        </button>
                      </div>
                    </div>
                    <DynamicText
                      text={tonality.toString()}
                      className="place-self-center pt-2 dark:text-white"
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
                      className="w-5 h-5 rounded-2xl accent-jubilateBlue-500 dark:accent-jubilateBlue-400"
                    />
                  </div>

                  <div className="flex gap-4 items-center justify-between">
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
                        document.body.classList.toggle("dark");
                      }}
                      className="w-5 h-5 rounded-2xl accent-jubilateBlue-500 dark:accent-jubilateBlue-400"
                    />
                  </div>
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

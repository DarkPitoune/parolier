import { isDarkAtom } from "@/components";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";

type SidePanelProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  header?: ReactNode;
  children: ReactNode;
};

function SidePanel({ open, onClose, title, header, children }: SidePanelProps) {
  const darkMode = useAtomValue(isDarkAtom);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={clsx("relative z-10", darkMode && "dark")}
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-jubilateBlue-300/40 transition duration-300 ease-in-out data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-24">
            <DialogPanel
              transition
              className="pointer-events-auto relative w-screen max-w-md min-w-0 transform transition duration-300 ease-in-out data-closed:translate-x-full sm:duration-500"
            >
              <div className="flex h-full gap-2 md:gap-6 flex-col overflow-y-scroll bg-white dark:bg-gray-800 py-6 shadow-xl px-4 sm:px-6 text-black dark:text-white">
                {header ?? (
                  <DialogTitle className="text-5xl font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400">
                    {title}
                  </DialogTitle>
                )}
                {children}
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export { SidePanel };

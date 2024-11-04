import { ArrowPathIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import supabase from "@/utils/supabase";
import { FollowButton, TakeLeadButton } from "./Contexts/LeaderButtons";
import { darkModeAtom } from "./Contexts/SettingsContext";
import { useAtom } from "jotai";
import { ComputerDesktopIcon } from "@heroicons/react/24/solid";
import { SettingsButton } from "./SettingsButton";

export const CornerMenu = ({
  navigate,
}: {
  navigate: (to: string) => void;
}) => {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);

  const loadAllSongs = useCallback(() => {
    const promise = supabase
      .from("songs")
      .select("title, id, tags (id, name, svg, color)")
      .then(({ data: songs }) =>
        songs?.map(({ id }) =>
          supabase
            .from("songs")
            .select("*, tags(name, id, svg, color)")
            .eq("id", id)
        )
      );
    toast.promise(promise as Promise<void>, {
      loading: "Chargement...",
      success: "Liste mise à jour",
      error: "Erreur !",
    });
  }, []);

  const [isExpanded, setIsExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const isInsideWrapper =
          e.touches[0].clientX >= rect.left &&
          e.touches[0].clientX <= rect.right &&
          e.touches[0].clientY >= rect.top &&
          e.touches[0].clientY <= rect.bottom;

        setIsExpanded(isInsideWrapper);
      }
    };

    document.addEventListener("touchstart", handleTouchStart);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  return (
    <div
      className={clsx(
        "fixed bottom-0 right-0 rounded-tl-full transition-all ease-in-out overflow-clip z-10",
        isExpanded ? "size-64" : "size-24"
      )}
      ref={wrapperRef}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div
        className={clsx(
          "bg-jubilateBlue-500 absolute size-16 rounded-full transition-all ease-in-out flex items-center justify-center",
          isExpanded ? "bottom-12 right-12" : "-bottom-2 -right-2"
        )}
      >
        <img src="/svg/Jubilate_Croix.svg" alt="logo" className="size-10" />

        <button
          onClick={loadAllSongs}
          type="button"
          className={clsx(
            "bg-jubilateGreen absolute top-2 z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center",
            isExpanded ? "-left-20" : "left-2"
          )}
        >
          <ArrowPathIcon color="white" className="size-8" />
        </button>
        <SettingsButton isExpanded={isExpanded} />
        <FollowButton isExpanded={isExpanded} />
        <button
          onClick={() => setDarkMode(!darkMode)}
          type="button"
          className={clsx(
            "absolute bg-yellow-200 ease-in-out z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center",
            isExpanded ? "-top-[3.5rem] -right-[3.5rem]" : "right-2 top-2"
          )}
          style={{ backgroundColor: darkMode ? "#fde047" : "#0f172a" }}
        >
          {darkMode ? (
            <SunIcon color="white" className="size-8" />
          ) : (
            <MoonIcon color="white" className="size-8" />
          )}
        </button>
      </div>
    </div>
  );
};

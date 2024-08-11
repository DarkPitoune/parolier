import { ArrowPathIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import supabase from "../utils/supabase";
import { SettingsContext } from "./SettingsContextProvider";
import { useLeader } from "./LeaderContext";
import { FollowButton, TakeLeadButton } from "./LeaderButtons";

export const CornerMenu = () => {
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
  }, [supabase]);

  const [settings, setSettings] = useContext(SettingsContext);
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
      className={`fixed bottom-0 right-0 rounded-tl-full ${
        isExpanded ? "size-64" : "size-24"
      } transition-all ease-in-out overflow-clip z-10`}
      ref={wrapperRef}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div
        className={`bg-jubilateBlue-500 absolute ${
          isExpanded ? "bottom-12 right-12" : "-bottom-2 -right-2"
        } size-16 rounded-full transition-all ease-in-out flex items-center justify-center`}
      >
        <img src="/svg/Jubilate_Croix.svg" alt="logo" className="size-10" />
        <button
          onClick={loadAllSongs}
          className={`bg-green-500 absolute ${
            isExpanded ? "-left-20" : "left-2"
          } top-2 z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center`}
        >
          <ArrowPathIcon color="white" className="size-8" />
        </button>
        <TakeLeadButton isExpanded={isExpanded} />
        <FollowButton isExpanded={isExpanded} />
        <button
          onClick={() =>
            setSettings({ ...settings, darkMode: !settings.darkMode })
          }
          className={`absolute ${
            isExpanded ? "-top-[3.5rem] -right-[3.5rem]" : "right-2 top-2"
          } ease-in-out z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center`}
          style={{ backgroundColor: settings.darkMode ? "#D4A021" : "black" }}
        >
          {settings.darkMode ? (
            <SunIcon color="white" className="size-8" />
          ) : (
            <MoonIcon color="white" className="size-8" />
          )}
        </button>
      </div>
    </div>
  );
};

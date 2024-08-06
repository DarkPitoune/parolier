import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useCallback } from "react";
import toast from "react-hot-toast";
import supabase from "../utils/supabase";

export const CornerMenu = () => {
  const loadAllSongs = useCallback(() => {
    supabase
      .from("songs")
      .select("title, id, tags (id, name, svg, color)")
      .then(({ data }) => {
        toast.success("Liste mise à jour");
        return data || [];
      })
      .then((songs) =>
        songs.map(({ id }) =>
          supabase
            .from("songs")
            .select("*, tags(name, id, svg, color)")
            .eq("id", id)
        )
      )
      .then((promises) =>
        Promise.all(promises).then((res) => {
          if (res.every((res) => res.data != undefined))
            toast.success("Paroles mis à jour !");
          else toast.error("Erreur !");
        })
      );
  }, [supabase]);

  return (
    <div className="fixed bottom-0 right-0 size-24 group hover:size-64 transition-all ease-in-out overflow-clip z-10">
      <div className="bg-jubilateBlue-500 absolute group-hover:bottom-12 -bottom-2 -right-2 group-hover:right-12 size-16 rounded-full transition-all ease-in-out flex items-center justify-center">
        <img src="/svg/Jubilate_Croix.svg" alt="logo" className="size-10" />
        <button
          onClick={loadAllSongs}
          className="bg-green-500 absolute group-hover:-left-20 ease-in-out left-2 top-2 z-1 size-12 rounded-full transition-all -z-10 flex items-center justify-center"
        >
          <ArrowPathIcon color="white" className="size-8" />
        </button>
      </div>
    </div>
  );
};

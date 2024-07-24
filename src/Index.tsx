import {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import supabase from "./utils/supabase";
import { Song } from "./assets/types";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";
import { SearchIcon } from "./svg components/SearchIcon";

function Index() {
  const [songs, setSongs] = useState<Omit<Song, "strophes">[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Omit<Song, "strophes">[]>(
    []
  );
  const fuseOptions = { keys: ["title"] };
  const fuse = useMemo(() => new Fuse(songs, fuseOptions), [songs]);

  useEffect(() => {
    supabase
      .from("songs")
      .select("title, id")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSongs(data);
          setFilteredSongs(data);
          fuse.setCollection(data);
        }
      });
  }, []);

  const search: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.target.value.length === 0) setFilteredSongs(songs);
      else
        setFilteredSongs(
          fuse.search(event.target.value).map((hit) => hit.item)
        );
    },
    [songs]
  );

  return (
    <div className="flex flex-col">
      <div className="bg-jubilateBlue-500 sticky top-0 p-4 gap-4 flex items-center">
        <div className="flex bg-white rounded-full h-fit w-fit pl-2 gap-1 items-center">
          <SearchIcon className="w-5 fill-jubilateBlue-500" />
          <input
            className="w-full h-9 rounded-full px-2 outline-none"
            type="search"
            onChange={search}
            placeholder="Vite, une idée..."
          ></input>
        </div>
        <img className="h-12" src="/svg/logo.svg"></img>
      </div>

      <div className="flex flex-col items-stretch px-10 divide-y divide-jubilateBlue-300">
        {filteredSongs.map((song) => (
          <Link
            className="px-2 py-4 hover:bg-jubilateBlue-100"
            key={song.id}
            to={`/songs/${song.id}`}
          >
            {song.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

export { Index };

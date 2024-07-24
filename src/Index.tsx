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
      <div className="bg-gray-200 sticky top-0 p-4">
        <input
          className="border border-blue-50 w-full"
          type="search"
          onChange={search}
        ></input>
      </div>
      <div className="flex flex-col items-stretch">
        {filteredSongs.map((song) => (
          <Link
            className="px-2 py-4 border border-gray-100 hover:bg-gray-50"
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

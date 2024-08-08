import {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import supabase from "./utils/supabase";
import { Tag, TaggedSong } from "./assets/types";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";
import { SearchIcon } from "./svg components/SearchIcon";
import DynamicText from "./components/DynamicText";
import { ChevronUpIcon } from "@heroicons/react/16/solid";

function Index() {
  const [songs, setSongs] = useState<Omit<TaggedSong, "strophes">[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<
    Omit<TaggedSong, "strophes">[]
  >([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [tagTabOpen, setTagTabOpen] = useState(true);
  const fuse = useMemo(() => new Fuse(songs, { keys: ["title"] }), [songs]);

  const toggleTag = (id: number) => {
    setSelectedTags((oldTags) => {
      if (!oldTags.includes(id)) return oldTags.concat([id]);
      return oldTags.filter((tagId) => tagId !== id);
    });
  };

  useEffect(() => {
    supabase
      .from("songs")
      .select("title, id, tags (id, name, svg, color)")
      .then(({ data }) => {
        if (data && data.length > 0) {
          data.sort((a, b) => a.id - b.id);
          setSongs(data);
          setFilteredSongs(data);
          fuse.setCollection(data);
        }
      });
    supabase
      .from("tags")
      .select()
      .then(({ data }) => {
        if (data && data.length > 0) {
          data.sort((a, b) => a.id - b.id);
          setTags(data);
        }
      });
  }, []);

  useEffect(() => {
    window.scroll({
      top: parseInt(sessionStorage.getItem("indexScroll") || "0"),
    });
  }, [songs]);

  useEffect(() => {
    const setScrollY = () =>
      sessionStorage.setItem("indexScroll", "" + window.scrollY);
    window.addEventListener("scroll", setScrollY);
    return () => {
      window.removeEventListener("scroll", setScrollY);
    };
  }, []);

  const search: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.target.value.length === 0) setFilteredSongs(songs);
      else {
        window.scrollTo(0, 0);
        if (!isNaN(parseInt(event.target.value))) {
          const song = songs.find((s) => s.id === parseInt(event.target.value));
          setFilteredSongs(song ? [song] : []);
        } else {
          setFilteredSongs(
            fuse.search(event.target.value).map((hit) => hit.item)
          );
        }
      }
    },
    [songs, fuse]
  );

  const isCorrectTag = (song: Omit<TaggedSong, "strophes">) => {
    if (selectedTags.length === 0) return true;
    return song.tags.some(({ id }) => selectedTags.includes(id));
  };

  return (
    <div className="bg-white dark:bg-gray-800">
      <div className="sticky top-0 bg-white dark:bg-gray-800">
        <div className="bg-jubilateBlue-500 dark:bg-slate-900 px-6 py-4 gap-4 flex justify-between items-center">
          <div className="flex bg-white flex-1 rounded-full w-fit pl-2 gap-1 items-center">
            <SearchIcon className="w-5 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
            <input
              className="w-full h-9 rounded-full px-2 outline-none bg-white dark:bg-white"
              type="search"
              onChange={search}
              placeholder="Vite, une idée..."
            ></input>
          </div>
          <img className="h-12" src="/svg/logo.svg"></img>
        </div>
        <div className="px-6 py-2 flex flex-col items-stretch shadow font-flame">
          <button
            className="flex gap-2 text-jubilateBlue-500 dark:text-jubilateBlue-400 items-center"
            onClick={() => setTagTabOpen((v) => !v)}
          >
            <ChevronUpIcon
              data-tabopen={tagTabOpen}
              className="size-10 data-[tabopen=false]:rotate-180 transition"
            />
            <h3 className="text-2xl font-bold">Filtres</h3>
            {selectedTags.length > 0 && (
              <div className="bg-jubilateBlue-500 rounded-full text-white font-bold w-6">
                {selectedTags.length}
              </div>
            )}
          </button>
          <div>
            {tagTabOpen &&
              tags.map((tag) => (
                <button
                  onClick={() => toggleTag(tag.id)}
                  key={tag.id}
                  aria-checked={selectedTags.includes(tag.id)}
                  className={`rounded-full border-2 font-semibold px-3 py-0.5 inline-flex items-center gap-2 m-1
        ${
          selectedTags.includes(tag.id)
            ? "text-white bg-[var(--tag-color)] border-[var(--tag-color)]"
            : "text-[var(--tag-color)] bg-transparent border-[var(--tag-color)] border-2"
        }`}
                  style={{ "--tag-color": tag.color } as React.CSSProperties}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: tag.svg }}
                    style={{
                      fill: selectedTags.includes(tag.id) ? "white" : tag.color,
                    }}
                    className="w-4 h-4"
                  />
                  {tag.name}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-stretch px-2 divide-y divide-jubilateBlue-300 dark:bg-gray-800">
        {filteredSongs.filter(isCorrectTag).map((song) => (
          <Link
            className="px-2 py-4 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 flex items-baseline gap-3 text-black dark:text-jubilateBlue-400"
            key={song.id}
            to={`/songs/${song.id}`}
          >
            <div className="w-10 text-center border-r font-bold">{song.id}</div>
            <DynamicText
              className="grow text-black dark:text-white"
              text={song.title}
            />
            <div className="flex gap-2">
              {song.tags.map((tag) => (
                <div
                  style={{ fill: tag.color }}
                  className="size-6 "
                  key={tag.id}
                  dangerouslySetInnerHTML={{ __html: tag.svg }}
                ></div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export { Index };

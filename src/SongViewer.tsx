import { Link, useParams } from "react-router-dom";
import supabase from "./utils/supabase";
import { Song, Strophe } from "./assets/types";
import { useEffect, useState } from "react";
import { SlideShow } from "./SlideShow";

function SongViewer() {
  const { songId } = useParams();
  const [song, setSong] = useState<Song>();
  const [newStrophes, setNewStrophes] = useState<Strophe[]>([]);
  const [slideShow, setSlideShow] = useState(false);

  useEffect(() => {
    supabase
      .from("songs")
      .select()
      .eq("id", songId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSong(data[0]);
          setNewStrophes(data[0].strophes);
        }
      });
  }, []);

  useEffect(() => {
    const handleQuit = () => {
      if (!document.fullscreenElement) setSlideShow(false);
    };
    document.addEventListener("fullscreenchange", handleQuit);
  }, []);

  if (!song) return null;

  return slideShow ? (
    <SlideShow strophes={song.strophes} />
  ) : (
    <>
      <Link className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200" to="/">
        Retour à l'index
      </Link>
      <div className="flex flex-col gap-8">
        <h1>{song.title}</h1>
        <div className="flex flex-col gap-4">
          {newStrophes.map((strophe, index) => (
            <div
              data-type={strophe.type}
              className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold flex gap-8"
              key={strophe.text + index} // oops that may be hot garbage...
            >
              <div className="flex-1">{strophe.text}</div>
              <div className="flex-1">{strophe.chords}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          setSlideShow(true);
          document.body.requestFullscreen();
        }}
      >
        Slides
      </button>
    </>
  );
}
export { SongViewer };

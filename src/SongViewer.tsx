import { Link, useParams } from "react-router-dom";
import supabase from "./utils/supabase";
import { Strophe, TaggedSong } from "./assets/types";
import { useEffect, useState } from "react";
import { SlideShow } from "./SlideShow";
import { ChevronLeft } from "./svg components/ChevronLeftIcon";
import { MenuIcon } from "./svg components/MenuIcon";
import { SidePanel } from "./components/SidePanel";
import DynamicText from "./components/DynamicText";

function SongViewer() {
  const { songId } = useParams();
  const [song, setSong] = useState<TaggedSong>();
  const [newStrophes, setNewStrophes] = useState<Strophe[]>([]);
  const [slideShow, setSlideShow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("songs")
      .select("*, tags(name, id, svg, color)")
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

  return slideShow ? (
    <SlideShow strophes={song?.strophes || []} />
  ) : (
    <div>
      <SidePanel open={open} setOpen={setOpen} />
      <div className="grid grid-cols-6 py-4 px-6 border-b-4 border-jubilateBlue-500">
        <Link className="w-fit h-fit col-span-1" to="/">
          <ChevronLeft className="w-10 fill-jubilateBlue-500 hover:fill-jubilateBlue-700 place-self-begin" />
        </Link>

        <div className="col-span-4" />

        <button
          className="w-fit h-fit col-span-1 place-self-end"
          onClick={() => {
            setOpen(!open);
          }}
        >
          <MenuIcon className="w-10 fill-jubilateBlue-500 " />
        </button>
      </div>

      {song && (
        <div className="flex flex-col gap-4 p-4">
          <h1 className="font-flame text-3xl">{song.title}</h1>
          <div className="flex gap-8 px-4">
            {song.tags.map((tag) => (
              <div className="flex gap-1" key={tag.id}>
                <div
                  style={{ fill: tag.color }}
                  className="size-6"
                  dangerouslySetInnerHTML={{ __html: tag.svg }}
                ></div>
                <div className="font-bold" style={{ color: tag.color }}>
                  {tag.name}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-8">
            {newStrophes.map((strophe, index) => (
              <div
                data-type={strophe.type}
                className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold"
                key={index}
              >
                {strophe.content.map((line, lineIndex) => (
                  <div className="grid grid-cols-3 gap-2" key={lineIndex}>
                    <DynamicText className="col-span-2" text={line.text} />
                    <DynamicText className="col-span-1" text={line.chords} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="hidden md:block bg-jubilateBlue-500 text-white p-4 m-4 hover:bg-jubilateBlue-700 text-xl w-fit h-fit"
        onClick={() => {
          setSlideShow(true);
          document.body.requestFullscreen();
        }}
      >
        Slides
      </button>
    </div>
  );
}
export { SongViewer };

import { Link, useParams } from "react-router-dom";
import supabase from "./utils/supabase";
import { TaggedSong } from "./assets/types";
import { Fragment, useContext, useEffect, useState } from "react";
import { SlideShow } from "./SlideShow";
import { ChevronLeft } from "./svg components/ChevronLeftIcon";
import { MenuIcon } from "./svg components/MenuIcon";
import { SidePanel } from "./components/SidePanel";
import DynamicText from "./components/DynamicText";
import { addChorus } from "./utils/addChorus";
import { SettingsContext } from "./SettingsContextProvider";
import { transposeSong } from "./utils/tonalManipulation";

function SongViewer() {
  const { songId } = useParams();
  const [originalSong, setOriginalSong] = useState<TaggedSong>();
  const [song, setSong] = useState<TaggedSong>();
  const [slideShow, setSlideShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useContext(SettingsContext);

  useEffect(() => {
    supabase
      .from("songs")
      .select("*, tags(name, id, svg, color)")
      .eq("id", songId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOriginalSong(data[0]);
          setSong(data[0]);
        }
      });
  }, []);

  useEffect(() => {
    setSong(transposeSong(originalSong, settings.transpositionStep));
  }, [settings.transpositionStep]);

  useEffect(() => {
    const handleQuit = () => {
      if (!document.fullscreenElement) setSlideShow(false);
    };
    document.addEventListener("fullscreenchange", handleQuit);
  }, []);

  return slideShow ? (
    <SlideShow strophes={addChorus(song?.strophes || [], settings.addChorus)} />
  ) : (
    <div>
      <SidePanel open={open} setOpen={setOpen} />
      <div className="grid grid-cols-6 py-4 px-6 border-b-4 border-jubilateBlue-500 sticky top-0 bg-white">
        <Link
          className="w-fit col-span-1"
          to="/"
          onClick={() => {
            setSettings({
              ...settings,
              transpositionStep: (settings.transpositionStep = 0),
            });
          }}
        >
          <ChevronLeft className="w-10 fill-jubilateBlue-500 hover:fill-jubilateBlue-700 place-self-begin" />
        </Link>

        <div className="col-span-4" />

        <button
          className="w-fit col-span-1 place-self-end"
          onClick={() => {
            setOpen(!open);
          }}
        >
          <MenuIcon className="w-10 fill-jubilateBlue-500 " />
        </button>
      </div>

      {song && (
        <div className="flex flex-col gap-4 px-4">
          <div className="flex gap-4 items-baseline">
            <h1 className="font-flame text-3xl text-jubilateBlue-500">
              {song.id}.
            </h1>
            <h1 className="font-flame text-3xl">{song.title}</h1>
          </div>
          <div className="flex gap-8 px-4 font-flame">
            <div></div>
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
          <div className="flex flex-col gap-4">
            {addChorus(song.strophes, settings.addChorus).map(
              (strophe, index) => (
                <div
                  data-type={strophe.type}
                  className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold grid gap-x-2"
                  style={{
                    gridTemplateColumns: settings.showChords
                      ? "1fr 3fr"
                      : "1fr",
                  }}
                  key={index}
                >
                  {strophe.content.map((line, lineIndex) => (
                    <Fragment key={lineIndex}>
                      {settings.showChords && (
                        <DynamicText
                          className="bg-jubilateBlue-100 outline-8 border-jubilateBlue-100 border-4"
                          text={line.chords}
                        />
                      )}
                      <DynamicText className="" text={line.text} />
                    </Fragment>
                  ))}
                </div>
              )
            )}
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

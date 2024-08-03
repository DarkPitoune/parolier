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
import { transposeLine } from "./utils/tonalManipulation";
import { DisplaylIcon } from "./svg components/DisplayIcon";

function SongViewer() {
  const { songId } = useParams();
  const [tonality, setTonality] = useState(0);
  const [song, setSong] = useState<TaggedSong>();
  const [slideShow, setSlideShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [settings] = useContext(SettingsContext);

  useEffect(() => {
    supabase
      .from("songs")
      .select("*, tags(name, id, svg, color)")
      .eq("id", songId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSong(data[0]);
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
    <SlideShow strophes={addChorus(song?.strophes || [], settings.addChorus)} />
  ) : (
    <div className="dark:bg-gray-800">
      <SidePanel
        open={open}
        setOpen={setOpen}
        tonality={tonality}
        setTonality={setTonality}
      />
      <div className="grid grid-cols-6 items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky top-0 bg-white dark:bg-gray-900">
        <Link className="w-fit col-span-1" to={`/#${songId}`}>
          <ChevronLeft className="w-12 fill-jubilateBlue-500 dark:fill-jubilateBlue-400 hover:fill-jubilateBlue-700 place-self-begin" />
        </Link>

        <div className="col-span-4" />

        <div className="col-span-1 flex items-center gap-4 place-self-end">
          <button
            className="rounded-full place-self-end hidden md:block bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white p-4  text-xl w-fit h-fit"
            onClick={() => {
              setSlideShow(true);
              document.body.requestFullscreen();
            }}
          >
            <DisplaylIcon className="w-4 h-4 fill-white" />
          </button>
          <button
            className="w-fit place-self-end"
            onClick={() => {
              setOpen(!open);
            }}
          >
            <MenuIcon className="w-10 fill-jubilateBlue-500 dark:fill-jubilateBlue-400 " />
          </button>
        </div>
      </div>

      {song && (
        <div className="flex flex-col gap-4 px-4 bg-white dark:bg-gray-800 pt-4">
          <div className="flex gap-4 items-center">
            <h1 className="font-flame text-3xl text-black dark:text-white">
              {song.id}.
            </h1>
            <h1 className="font-flame text-3xl text-black dark:text-white">
              {song.title}
            </h1>
          </div>
          <div className="flex gap-8 px-4 font-flame">
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
                          className="bg-jubilateBlue-100 dark:bg-slate-600 outline-8 border-jubilateBlue-100 dark:border-slate-600 border-4 text-black dark:text-white"
                          text={transposeLine(line.chords, tonality)}
                        />
                      )}
                      <DynamicText
                        className=" text-black dark:text-white"
                        text={line.text}
                      />
                    </Fragment>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export { SongViewer };

import { Link, useParams } from "react-router-dom";
import supabase from "./utils/supabase";
import { Song } from "./assets/types";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContextProvider";

function SongViewer() {
  const { songId } = useParams();
  const [song, setSong] = useState<Song>();
  const [editedSong, setEditedSong] = useState<Song>();
  const [editing, setEditing] = useState(false);
  const user = useContext(AuthContext);

  useEffect(() => {
    supabase
      .from("songs")
      .select()
      .eq("id", songId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSong(data[0]);
          setEditedSong(data[0]);
        }
      });
  }, []);

  return (
    <div>
      <Link className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200" to="/">
        Retour à l'index
      </Link>
      {song && (
        <div className="flex flex-col gap-8">
          <h1>{song.title}</h1>
          <div className="flex flex-col gap-4">
            {song.strophes.map((strophe) => (
              <div
                data-type={strophe.type}
                className="whitespace-pre-wrap data-[type=chorus]:font-bold flex gap-8"
                key={strophe.text}
              >
                <div>{strophe.text}</div>
                <div>{strophe.chords}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {false && user && (
        <button onClick={() => setEditing(true)}>Modifier</button>
      )}
    </div>
  );
}
export { SongViewer };

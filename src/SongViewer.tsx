import { Link, useParams } from "react-router-dom";
import supabase from "./utils/supabase";
import { Song, Strophe } from "./assets/types";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContextProvider";
import toast from "react-hot-toast";

function SongViewer() {
  const { songId } = useParams();
  const [song, setSong] = useState<Song>();
  const [newStrophes, setNewStrophes] = useState<Strophe[]>([]);
  const [editing, setEditing] = useState(false);
  const [user] = useContext(AuthContext);

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

  const setText = useCallback((index: number, value: string) => {
    setNewStrophes((oldStrophes) => {
      oldStrophes[index].text = value;
      return [...oldStrophes];
    });
  }, []);

  const addStrophe = useCallback(() => {
    setNewStrophes((oldStrophes) => {
      const res = [...oldStrophes];
      res.push({ text: "", chords: "", type: "verse" });
      return res;
    });
  }, []);

  const save = useCallback(() => {
    if (song === undefined) return;
    supabase
      .from("songs")
      .update({ strophes: newStrophes })
      .eq("id", song.id)
      .select()
      .then(({ data, error }) => {
        if (error) toast.error("Une erreur est survenue");
        if (data && data.length > 0) toast.success("Enregistré !");
      });
  }, [newStrophes]);

  return (
    <div>
      <Link className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200" to="/">
        Retour à l'index
      </Link>
      {song && (
        <div className="flex flex-col gap-8">
          <h1>{song.title}</h1>
          <div className="flex flex-col gap-4">
            {newStrophes.map((strophe, index) => (
              <div
                data-type={strophe.type}
                className="whitespace-pre-wrap data-[type=chorus]:font-bold flex gap-8"
                key={strophe.text + index} // oops that may be hot garbage...
              >
                <div
                  onInput={(e) =>
                    setText(index, (e.target as HTMLDivElement).innerText)
                  }
                  contentEditable={editing}
                  suppressContentEditableWarning={true}
                  className={`flex-1 ${editing && "border border-blue-100"}`}
                >
                  {strophe.text}
                </div>
                <div
                  contentEditable={editing}
                  suppressContentEditableWarning={true}
                  className={`flex-1 ${editing && "border border-blue-100"}`}
                >
                  {strophe.chords}
                </div>
              </div>
            ))}
            {editing && (
              <button onClick={addStrophe}>Ajouter un couplet</button>
            )}
          </div>
        </div>
      )}
      {user &&
        (editing ? (
          <button onClick={save}>Enregistrer</button>
        ) : (
          <button onClick={() => setEditing(true)}>Modifier</button>
        ))}
    </div>
  );
}
export { SongViewer };

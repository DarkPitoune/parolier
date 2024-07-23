import { FormEventHandler, useContext, useState } from "react";
import supabase from "./utils/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContextProvider";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, refresh] = useContext(AuthContext);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    supabase.auth
      .signInWithPassword({ email, password })
      .then(({ data, error }) => {
        if (error) toast.error("Identifiants incorrects");
        if (data.user) {
          refresh();
          navigate(searchParams.get("redirect") || "/");
        }
      });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="email" onChange={(e) => setEmail(e.target.value)}></input>
        <input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        ></input>
        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
}

export { Login };

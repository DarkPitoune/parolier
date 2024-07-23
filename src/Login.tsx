import { FormEventHandler, useState } from "react";
import supabase from "./utils/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    supabase.auth
      .signInWithPassword({ email, password })
      .then(({ data, error }) => {
        if (error) setError(true);
        if (data.user) navigate(searchParams.get("redirect") || "/");
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
        {error && <div>Identification invalide</div>}
        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
}

export { Login };

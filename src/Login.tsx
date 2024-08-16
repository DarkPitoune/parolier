import { type FormEventHandler, useContext, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "./components/AuthContextProvider";
import supabase from "./utils/supabase";

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
				<input type="email" onChange={(e) => setEmail(e.target.value)} />
				<input type="password" onChange={(e) => setPassword(e.target.value)} />
				<button type="submit">Se connecter</button>
			</form>
		</div>
	);
}

export { Login };

import { createContext, ReactNode, useEffect, useState } from "react";
import supabase from "./utils/supabase";
import { User } from "@supabase/supabase-js";

const AuthContext = createContext<User | null>(null);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export { AuthContextProvider, AuthContext };

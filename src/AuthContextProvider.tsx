import { createContext, ReactNode, useEffect, useState } from "react";
import supabase from "./utils/supabase";
import { User } from "@supabase/supabase-js";

const AuthContext = createContext<[User | null, () => void]>([null, () => {}]);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const refresh = () => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  };
  useEffect(refresh, []);

  return (
    <AuthContext.Provider value={[user, refresh]}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContextProvider, AuthContext };

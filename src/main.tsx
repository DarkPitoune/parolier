import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { Index } from "./Index";
import { SongViewer } from "./SongViewer";
import { Login } from "./Login";
import { AuthContextProvider } from "./components/AuthContextProvider";
import { Toaster } from "react-hot-toast";
import { SettingsContextProvider } from "./components/SettingsContextProvider";
import { CornerMenu } from "./components/CornerMenu";
import { LeaderContextProvider } from "./components/LeaderContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/songs/:songId",
    element: <SongViewer />,
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Toaster position="bottom-right" />
    <AuthContextProvider>
      <LeaderContextProvider navigate={router.navigate}>
        <SettingsContextProvider>
          <RouterProvider router={router} />
          <CornerMenu />
        </SettingsContextProvider>
      </LeaderContextProvider>
    </AuthContextProvider>
  </React.StrictMode>
);

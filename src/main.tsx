import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { Index } from "./Index";
import { Login } from "./Login";
import { SongViewer } from "./SongViewer";
import { AuthContextProvider } from "./components/AuthContextProvider";
import { CornerMenu } from "./components/CornerMenu";
import { LeaderContextProvider } from "./components/LeaderContext";
import { useAtomValue } from "jotai";
import { darkModeAtom } from "./components/SettingsContext";
import clsx from "clsx";

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

const App = () => {
	const darkMode = useAtomValue(darkModeAtom);
	return (
		<AuthContextProvider>
			<LeaderContextProvider navigate={router.navigate}>
				<div
					className={clsx(
						darkMode ? "dark bg-gray-800" : "light",
						"min-h-screen",
					)}
				>
					<main>
						<RouterProvider router={router} />
						<CornerMenu />
					</main>
				</div>
			</LeaderContextProvider>
		</AuthContextProvider>
	);
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<Toaster position="bottom-right" />
		<App />
	</React.StrictMode>,
);

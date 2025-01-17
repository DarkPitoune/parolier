import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import {
	AuthContextProvider,
	CornerMenu,
	LeaderContextProvider,
	darkModeAtom,
} from "@/components";
import { Index, Login, Setlists, SlideShow, SongViewer } from "@/pages";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { Toaster } from "react-hot-toast";

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
		path: "/setlists",
		element: <Setlists />,
	},
	{
		path: "/setlists/:setlistId",
		element: <Setlists />,
	},
	{
		path: "/songs/:songId",
		element: <SongViewer />,
	},
	{
		path: "/slides",
		element: <SlideShow />,
	},
	{
		path: "/slides/:songId",
		element: <SlideShow />,
	},
	{
		path: "*",
		element: <img src="https://http.dog/404.jpg" alt="404" />,
	},
]);

const App = () => {
	const darkMode = useAtomValue(darkModeAtom);
	return (
		<>
			<Toaster position="bottom-right" />
			<AuthContextProvider>
				<div
					className={clsx(
						darkMode ? "dark bg-gray-800" : "light",
						"min-h-screen",
					)}
				>
					<LeaderContextProvider navigate={router.navigate}>
						<main>
							<RouterProvider router={router} />
							<CornerMenu />
						</main>
					</LeaderContextProvider>
				</div>
			</AuthContextProvider>
		</>
	);
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

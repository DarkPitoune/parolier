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
import { Index, SetlistViewer, Setlists, SlideShow, SongPage } from "@/pages";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { Toaster } from "react-hot-toast";
import SongEditor from "./pages/SongEditor";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Index />,
	},
	{
		path: "/setlists",
		element: <Setlists />,
	},
	{
		path: "/setlists/:setlistId/edit",
		element: <SetlistViewer />,
	},
	{
		path: "/setlists/:setlistId/steps/:stepNumber",
		element: <SongPage />,
	},
	{
		path: "/songs/:songId",
		element: <SongPage />,
	},
	{
		path: "/songs/edit/:songId",
		element: <SongEditor />,
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

if (navigator.storage) navigator.storage.persist(); // our way to tackle long term storage.. let's see how it goes

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

import * as React from "react";
import * as Sentry from "@sentry/react";
import * as ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import { AuthContextProvider, CornerMenu, darkModeAtom } from "@/components";
import {
	Index,
	SetlistEditor,
	Setlists,
	SlidePage,
	SongPage,
	ZapettePage,
	Analytics,
} from "@/pages";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { Toaster } from "react-hot-toast";
import SongEditor from "./pages/SongEditor";
import { SetlistPage } from "./pages/SetlistPage";
import { LeaderListener } from "./components/LeaderListener";

Sentry.init({
	dsn: "https://e3d0fd2959dec5c42a29102e0a89423c@o4509542487425024.ingest.de.sentry.io/4509542545162320",
	// Setting this option to true will send default PII data to Sentry.
	// For example, automatic IP address collection on events
	sendDefaultPii: true,
	integrations: [Sentry.browserTracingIntegration()],
	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
	tracePropagationTargets: [
		"localhost",
		/^https:\/\/parolier.jubilate.fr\/api\//,
	],
});

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
		element: <SetlistEditor />,
	},
	{
		path: "/setlists/:setlistId",
		element: <SetlistPage />,
	},
	{
		path: "/setlists/:setlistId/steps/:stepNumber/slide",
		element: <SlidePage />,
	},
	{
		path: "/songs/:songId",
		element: <SongPage />,
	},
	{
		path: "/songs/:songId/edit",
		element: <SongEditor />,
	},
	{
		path: "/slides",
		element: <SlidePage />,
	},
	{
		path: "/slides/:songId",
		element: <SlidePage />,
	},
	{
		path: "/analytics",
		element: <Analytics />,
	},
	{
		path: "/zapette",
		element: <ZapettePage />,
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
					<main>
						<LeaderListener router={router} />
						<RouterProvider router={router} />
						<CornerMenu />
					</main>
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

import { AuthContextProvider, CornerMenu, isDarkAtom } from "@/components";
import { systemPrefersDarkAtom } from "@/components/Contexts/SettingsContext";
import {
	Analytics,
	Bible,
	Index,
	Messe,
	PresenterPage,
	SetlistEditor,
	Setlists,
	SlidePage,
	SongPage,
	TextEditor,
} from "@/pages";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { BackgroundFetchIndicator } from "./components/BackgroundFetchIndicator";
import { LeaderListener } from "./components/LeaderListener";
import { OfflineBanner } from "./components/OfflineBanner";
import { CachePage } from "./pages/CachePage";
import { TextPage } from "./pages/TextPage";
import { Texts } from "./pages/Texts";
import "./index.css";
import { SetlistPage } from "./pages/SetlistPage";
import SongEditor from "./pages/SongEditor";
import { usePrefetchAllSetlistSteps } from "./hooks/queries/useSetlistQueries";
import { usePrefetchAllSongs } from "./hooks/queries/useSongQueries";
import { queryClient } from "./utils/queryClient";

Sentry.init({
	dsn: "https://e3d0fd2959dec5c42a29102e0a89423c@o4509542487425024.ingest.de.sentry.io/4509542545162320",
	enabled: import.meta.env.PROD && !import.meta.env.VITE_E2E,
	sendDefaultPii: true,
	integrations: [Sentry.browserTracingIntegration()],
	tracesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0,
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
		path: "/texts",
		element: <Texts />,
	},
	{
		path: "/texts/:textId",
		element: <TextPage />,
	},
	{
		path: "/texts/:textId/edit",
		element: <TextEditor />,
	},
	{
		path: "/bible",
		element: <Bible />,
	},
	{
		path: "/bible/:book",
		element: <Bible />,
	},
	{
		path: "/bible/:book/:chapter",
		element: <Bible />,
	},
	{
		path: "/messe",
		element: <Messe />,
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
		path: "/presenter",
		element: <PresenterPage />,
	},
	{
		path: "/presenter/:setlistId/:stepNumber",
		element: <PresenterPage />,
	},
	{
		path: "/cache",
		element: <CachePage />,
	},
	{
		path: "*",
		element: <img src="https://http.dog/404.jpg" alt="404" />,
	},
]);

if (navigator.storage) navigator.storage.persist(); // our way to tackle long term storage.. let's see how it goes

const PrefetchData = () => {
	usePrefetchAllSongs();
	usePrefetchAllSetlistSteps();
	return null;
};

const useSystemThemeSync = () => {
	const setSystemPrefersDark = useSetAtom(systemPrefersDarkAtom);
	React.useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [setSystemPrefersDark]);
};

const App = () => {
	const darkMode = useAtomValue(isDarkAtom);
	useSystemThemeSync();

	return (
		<QueryClientProvider client={queryClient}>
			<PrefetchData />
			<BackgroundFetchIndicator />
			<Toaster position="bottom-right" />
			<AuthContextProvider>
				<div
					className={clsx(
						darkMode ? "dark bg-gray-800" : "light",
						"min-h-screen",
					)}
				>
					<main>
						<OfflineBanner />
						<LeaderListener router={router} />
						<RouterProvider router={router} />
						<CornerMenu />
					</main>
				</div>
			</AuthContextProvider>
		</QueryClientProvider>
	);
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

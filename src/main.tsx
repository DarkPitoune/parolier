import { AuthContextProvider, ErrorBoundary, isDarkAtom } from "@/components";
import { systemPrefersDarkAtom } from "@/components/Contexts/SettingsContext";
import {
	Analytics,
	Bible,
	BibleToday,
	Index,
	Messe,
	PresenterPage,
	SetlistEditor,
	Setlists,
	SlidePage,
	SongPage,
	TextEditor,
} from "@/pages";
import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import {
	Outlet,
	RouterProvider,
	ScrollRestoration,
	createBrowserRouter,
} from "react-router-dom";
import { BackgroundFetchIndicator } from "./components/BackgroundFetchIndicator";
import { CornerMenu } from "./components/CornerMenu";
import { LeaderListener } from "./components/LeaderListener";
import { OfflineBanner } from "./components/OfflineBanner";
import { GlobalSidePanel } from "./components/SidePanel/variants/GlobalSidePanel";
import { CachePage } from "./pages/CachePage";
import { OrdinairePage } from "./pages/OrdinairePage";
import { Ordinaires } from "./pages/Ordinaires";
import { Refrains } from "./pages/Refrains";
import { TextPage } from "./pages/TextPage";
import { Texts } from "./pages/Texts";
import "./index.css";
import { useState } from "react";
import { usePrefetchAllSetlistSteps } from "./hooks/queries/useSetlistQueries";
import { usePrefetchAllSongs } from "./hooks/queries/useSongQueries";
import { SetlistPage } from "./pages/SetlistPage";
import SongEditor from "./pages/SongEditor";
import { queryClient } from "./utils/queryClient";

Sentry.init({
	dsn: "https://93a732f3dc5d4316bbf2fba04ba9dbc3@pitoune.bugsink.com/2",
	enabled: import.meta.env.PROD && !import.meta.env.VITE_E2E,
	release: `jubilatebook@${__APP_VERSION__}`,
	integrations: [],
	tracesSampleRate: 0,
});

const Layout = () => {
	const [panelOpen, setPanelOpen] = useState(false);
	return (
		<>
			<ScrollRestoration />
			<Outlet />
			<GlobalSidePanel open={panelOpen} onClose={() => setPanelOpen(false)} />
			<CornerMenu onOpen={() => setPanelOpen(true)} />
		</>
	);
};

const router = createBrowserRouter([
	{
		element: <Layout />,
		children: [
			{
				path: "/",
				element: <Index />,
			},
			{
				path: "/refrains",
				element: <Refrains />,
			},
			{
				path: "/ordinaires",
				element: <Ordinaires />,
			},
			{
				path: "/ordinaires/:ordinaireId",
				element: <OrdinairePage />,
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
				path: "/bible/today",
				element: <BibleToday />,
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
		],
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
						<ErrorBoundary>
							<RouterProvider router={router} />
						</ErrorBoundary>
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

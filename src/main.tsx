import { AuthContextProvider, ErrorBoundary, isDarkAtom } from "@/components";
import { systemPrefersDarkAtom } from "@/components/Contexts/SettingsContext";
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
import "./index.css";
import { useState } from "react";
import { usePrefetchAllSetlistItems } from "./hooks/queries/useSetlistQueries";
import {
	usePrefetchAllSongs,
	useSongsRealtimeSync,
} from "./hooks/queries/useSongQueries";
import { usePrefetchAllTexts } from "./hooks/queries/useTextQueries";
import { appRoutes } from "./routes";
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
		children: appRoutes,
	},
]);

if (navigator.storage) navigator.storage.persist(); // our way to tackle long term storage.. let's see how it goes

const PrefetchData = () => {
	usePrefetchAllSongs();
	usePrefetchAllSetlistItems();
	usePrefetchAllTexts();
	useSongsRealtimeSync();
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

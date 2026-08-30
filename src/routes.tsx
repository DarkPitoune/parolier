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
import type { RouteObject } from "react-router-dom";
import { CachePage } from "./pages/CachePage";
import { CertificatePage } from "./pages/CertificatePage";
import { OrdinairePage } from "./pages/OrdinairePage";
import { Ordinaires } from "./pages/Ordinaires";
import { Refrains } from "./pages/Refrains";
import { SetlistPage } from "./pages/SetlistPage";
import SongEditor from "./pages/SongEditor";
import { TextPage } from "./pages/TextPage";
import { Texts } from "./pages/Texts";

export const appRoutes: RouteObject[] = [
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
		path: "/certificate",
		element: <CertificatePage />,
	},
	{
		path: "*",
		element: <img src="https://http.dog/404.jpg" alt="404" />,
	},
];

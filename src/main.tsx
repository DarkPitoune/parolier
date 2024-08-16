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
				<main>
					<RouterProvider router={router} />
					<CornerMenu />
				</main>
			</LeaderContextProvider>
		</AuthContextProvider>
	</React.StrictMode>,
);

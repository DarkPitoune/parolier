import {
	type ConnectivityStatus,
	startConnectivityMonitor,
} from "@/utils/connectivityMonitor";
import { useEffect, useState } from "react";

const isSlideMode = () => {
	const path = window.location.pathname;
	return path.startsWith("/slides") || path.endsWith("/slide");
};

export const OfflineBanner = () => {
	const [status, setStatus] = useState<ConnectivityStatus>("checking");

	useEffect(() => {
		return startConnectivityMonitor(setStatus);
	}, []);

	if (status !== "offline") return null;

	const dotOnly = isSlideMode();

	return (
		<div
			data-testid="offline-banner"
			className="fixed bottom-3 left-3 flex items-center gap-1.5 bg-gray-700/90 text-white text-xs px-2.5 py-1 rounded-full z-50 backdrop-blur-sm"
		>
			<span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
			{!dotOnly && "Hors-ligne"}
		</div>
	);
};

import {
	type ConnectivityStatus,
	startConnectivityMonitor,
} from "@/utils/connectivityMonitor";
import { useEffect, useState } from "react";

export const OfflineBanner = () => {
	const [status, setStatus] = useState<ConnectivityStatus>("checking");

	useEffect(() => {
		return startConnectivityMonitor(setStatus);
	}, []);

	if (status !== "offline") return null;

	return (
		<div className="sticky top-0 bg-gray-700 text-white text-center text-sm py-1 z-50 h-6">
			Mode hors-ligne — données en cache
		</div>
	);
};

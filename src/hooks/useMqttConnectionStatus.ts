import { getMqttClient } from "@/utils/mqtt";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

type UseMqttConnectionStatusOptions = {
	showOnInitialConnect?: boolean;
	position?: "top-center" | "bottom-right";
};

export const useMqttConnectionStatus = (
	options: UseMqttConnectionStatusOptions = {},
) => {
	const { showOnInitialConnect = false, position = "top-center" } = options;
	const isInitialConnection = useRef(true);

	useEffect(() => {
		const client = getMqttClient();

		const handleConnect = () => {
			// Only show toast if it's a reconnection or if explicitly enabled for initial connect
			if (!isInitialConnection.current || showOnInitialConnect) {
				toast.success("Connected to server", {
					duration: 3000,
					position,
				});
			}

			isInitialConnection.current = false;
		};

		const handleOffline = () => {
			// Show brief error toast when connection is lost
			toast.error("Connection lost", {
				duration: 3000,
				position,
			});
		};

		const handleError = (error: Error) => {
			console.error("MQTT connection error:", error);
		};

		// Attach event handlers
		client.on("connect", handleConnect);
		client.on("offline", handleOffline);
		client.on("error", handleError);

		// Cleanup on unmount
		return () => {
			client.off("connect", handleConnect);
			client.off("offline", handleOffline);
			client.off("error", handleError);
		};
	}, [showOnInitialConnect, position]);
};

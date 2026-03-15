import { onlineManager } from "@tanstack/react-query";
import { atom } from "jotai";
import { supabaseUrl } from "./supabase";

export type ConnectivityStatus = "online" | "offline" | "checking";

export const connectivityStatusAtom = atom<ConnectivityStatus>("checking");

const PROBE_TIMEOUT_MS = 2000;
const PROBE_INTERVAL_MS = 30_000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let statusListeners: Array<(status: ConnectivityStatus) => void> = [];

const notifyListeners = (status: ConnectivityStatus) => {
	for (const listener of statusListeners) {
		listener(status);
	}
};

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Probes Supabase directly (not favicon which local router may serve)
 * with a 2-second timeout to detect "WiFi without internet".
 * Uses a GET with apikey header since HEAD returns 401 on Supabase REST.
 */
const probeConnectivity = async (): Promise<boolean> => {
	if (!navigator.onLine) return false;

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

		const response = await fetch(
			`${supabaseUrl}/rest/v1/songs?select=id&limit=1`,
			{
				method: "GET",
				cache: "no-store",
				signal: controller.signal,
				headers: {
					apikey: supabaseKey,
					"X-Connectivity-Probe": "1",
				},
			},
		);

		clearTimeout(timeoutId);
		return response.ok;
	} catch {
		return false;
	}
};

const runProbe = async () => {
	notifyListeners("checking");
	const isOnline = await probeConnectivity();
	const status: ConnectivityStatus = isOnline ? "online" : "offline";
	notifyListeners(status);
	onlineManager.setOnline(isOnline);
};

/**
 * Starts the connectivity monitor. Call once at app startup.
 * Returns an unsubscribe function.
 */
export const startConnectivityMonitor = (
	onStatusChange: (status: ConnectivityStatus) => void,
) => {
	statusListeners.push(onStatusChange);

	// Only start the interval once (first subscriber)
	if (statusListeners.length === 1) {
		// Initial probe
		runProbe();

		// Periodic probe every 30s
		intervalId = setInterval(runProbe, PROBE_INTERVAL_MS);

		// Immediate probe on navigator.onLine change
		window.addEventListener("online", runProbe);
		window.addEventListener("offline", runProbe);
	}

	return () => {
		statusListeners = statusListeners.filter((l) => l !== onStatusChange);

		if (statusListeners.length === 0 && intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
			window.removeEventListener("online", runProbe);
			window.removeEventListener("offline", runProbe);
		}
	};
};

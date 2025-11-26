import { useEffect } from "react";

export const useWakeLock = () => {
	useEffect(() => {
		// request for screen to keep awake : does not work on iOS PWAs
		let wakeLock: WakeLockSentinel | null = null;
		const requestWakeLock = async () => {
			try {
				wakeLock = await navigator.wakeLock.request("screen");
			} catch (err) {
				console.error(`Failed to request wake lock: ${err}`);
			}
		};
		requestWakeLock();

		return () => {
			wakeLock?.release();
		};
	}, []);
};

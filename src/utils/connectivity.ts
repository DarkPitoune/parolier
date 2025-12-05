/**
 * Checks if the device has actual internet connectivity
 * (not just connected to a network)
 *
 * @returns Promise<boolean> - true if internet is available, false otherwise
 */
export const hasInternetConnectivity = async (): Promise<boolean> => {
	// Quick check: if navigator reports offline, we're definitely offline
	if (!navigator.onLine) {
		return false;
	}

	// navigator.onLine can return true even when connected to a network without internet
	// So we need to verify with an actual network request
	try {
		// Try to fetch a small resource with a timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		const response = await fetch("/favicon.png", {
			method: "HEAD",
			cache: "no-store",
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		return response.ok;
	} catch {
		// Any error (network failure, timeout, etc.) means no internet
		return false;
	}
};

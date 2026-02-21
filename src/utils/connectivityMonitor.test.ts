import { onlineManager } from "@tanstack/react-query";
import { startConnectivityMonitor } from "./connectivityMonitor";

vi.mock("@tanstack/react-query", () => ({
	onlineManager: { setOnline: vi.fn() },
	atom: vi.fn(),
}));

vi.mock("./supabase", () => ({
	supabaseUrl: "https://test.supabase.co",
	default: {},
}));

const originalNavigator = navigator.onLine;
const originalFetch = globalThis.fetch;

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	Object.defineProperty(navigator, "onLine", { value: true, writable: true });
	globalThis.fetch = vi.fn();
});

afterEach(() => {
	vi.useRealTimers();
	Object.defineProperty(navigator, "onLine", {
		value: originalNavigator,
		writable: true,
	});
	globalThis.fetch = originalFetch;
});

describe("connectivityMonitor", () => {
	it("successful probe notifies checking then online", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true } as Response);

		const listener = vi.fn();
		const unsub = startConnectivityMonitor(listener);

		// Flush the initial probe (async)
		await vi.advanceTimersByTimeAsync(0);

		expect(listener).toHaveBeenCalledWith("checking");
		expect(listener).toHaveBeenCalledWith("online");
		expect(onlineManager.setOnline).toHaveBeenCalledWith(true);

		unsub();
	});

	it("navigator.onLine=false notifies offline without fetching", async () => {
		Object.defineProperty(navigator, "onLine", { value: false });

		const listener = vi.fn();
		const unsub = startConnectivityMonitor(listener);

		await vi.advanceTimersByTimeAsync(0);

		expect(listener).toHaveBeenCalledWith("checking");
		expect(listener).toHaveBeenCalledWith("offline");
		expect(globalThis.fetch).not.toHaveBeenCalled();
		expect(onlineManager.setOnline).toHaveBeenCalledWith(false);

		unsub();
	});

	it("fetch failure notifies offline", async () => {
		vi.mocked(globalThis.fetch).mockRejectedValue(new Error("network error"));

		const listener = vi.fn();
		const unsub = startConnectivityMonitor(listener);

		await vi.advanceTimersByTimeAsync(0);

		expect(listener).toHaveBeenCalledWith("checking");
		expect(listener).toHaveBeenCalledWith("offline");
		expect(onlineManager.setOnline).toHaveBeenCalledWith(false);

		unsub();
	});

	it("unsubscribe stops interval and removes listeners", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true } as Response);

		const listener = vi.fn();
		const unsub = startConnectivityMonitor(listener);

		await vi.advanceTimersByTimeAsync(0);
		listener.mockClear();

		unsub();

		// Advance past the interval — listener should NOT be called
		await vi.advanceTimersByTimeAsync(30_000);
		expect(listener).not.toHaveBeenCalled();
	});

	it("multiple subscribers share single interval, all notified", async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true } as Response);

		const listener1 = vi.fn();
		const listener2 = vi.fn();
		const unsub1 = startConnectivityMonitor(listener1);
		const unsub2 = startConnectivityMonitor(listener2);

		await vi.advanceTimersByTimeAsync(0);

		expect(listener1).toHaveBeenCalledWith("online");
		expect(listener2).toHaveBeenCalledWith("online");

		// Unsubscribe first — interval should still run for second
		unsub1();
		listener1.mockClear();
		listener2.mockClear();

		await vi.advanceTimersByTimeAsync(30_000);

		expect(listener1).not.toHaveBeenCalled();
		expect(listener2).toHaveBeenCalledWith("online");

		unsub2();
	});
});

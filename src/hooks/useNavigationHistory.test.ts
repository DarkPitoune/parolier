import { createTestQueryClient } from "@/test/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createStore } from "jotai";
import { Provider as JotaiProvider } from "jotai";
import type { ReactNode } from "react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import {
	navigationHistoryAtom,
	useRecordVisit,
	useRestoreScroll,
} from "./useNavigationHistory";

function createWrapper(
	store: ReturnType<typeof createStore>,
	routerState?: Record<string, unknown>,
) {
	return function Wrapper({ children }: { children: ReactNode }) {
		const qc = createTestQueryClient();
		const initialEntries = routerState
			? [{ pathname: "/", state: routerState }]
			: ["/"];
		return createElement(
			MemoryRouter,
			{ initialEntries },
			createElement(
				QueryClientProvider,
				{ client: qc },
				createElement(JotaiProvider, { store }, children),
			),
		);
	};
}

beforeEach(() => {
	localStorage.removeItem("navigationHistory");
});

describe("useRecordVisit", () => {
	test("records a visit", () => {
		const store = createStore();
		const wrapper = createWrapper(store);

		renderHook(
			() =>
				useRecordVisit({
					path: "/songs/1",
					title: "1. Test Song",
					type: "song",
				}),
			{ wrapper },
		);

		const history = store.get(navigationHistoryAtom);
		expect(history.length).toBe(1);
		expect(history[0].path).toBe("/songs/1");
		expect(history[0].title).toBe("1. Test Song");
	});

	test("deduplicates and keeps MRU order", () => {
		const store = createStore();
		const wrapper = createWrapper(store);

		const { unmount: u1 } = renderHook(
			() =>
				useRecordVisit({
					path: "/songs/1",
					title: "A",
					type: "song",
				}),
			{ wrapper },
		);
		u1();

		const { unmount: u2 } = renderHook(
			() =>
				useRecordVisit({
					path: "/songs/2",
					title: "B",
					type: "song",
				}),
			{ wrapper },
		);
		u2();

		renderHook(
			() =>
				useRecordVisit({
					path: "/songs/1",
					title: "A",
					type: "song",
				}),
			{ wrapper },
		);

		const history = store.get(navigationHistoryAtom);
		expect(history.length).toBe(2);
		expect(history[0].path).toBe("/songs/1");
		expect(history[1].path).toBe("/songs/2");
	});

	test("caps at 5 entries", () => {
		const store = createStore();
		const wrapper = createWrapper(store);

		for (let i = 1; i <= 6; i++) {
			const { unmount } = renderHook(
				() =>
					useRecordVisit({
						path: `/songs/${i}`,
						title: `Song ${i}`,
						type: "song",
					}),
				{ wrapper },
			);
			unmount();
		}

		const history = store.get(navigationHistoryAtom);
		expect(history.length).toBe(5);
		expect(history.find((h) => h.path === "/songs/1")).toBeUndefined();
	});

	test("null entry is a no-op", () => {
		const store = createStore();
		const wrapper = createWrapper(store);

		renderHook(() => useRecordVisit(null), { wrapper });

		const history = store.get(navigationHistoryAtom);
		expect(history.length).toBe(0);
	});

	test("saves scroll position on unmount", () => {
		const store = createStore();
		const wrapper = createWrapper(store);

		const { unmount } = renderHook(
			() =>
				useRecordVisit({
					path: "/songs/1",
					title: "Song 1",
					type: "song",
				}),
			{ wrapper },
		);

		Object.defineProperty(window, "scrollY", { value: 350, writable: true });
		unmount();

		const history = store.get(navigationHistoryAtom);
		expect(history[0].scrollY).toBe(350);

		Object.defineProperty(window, "scrollY", { value: 0, writable: true });
	});
});

describe("useRestoreScroll", () => {
	test("restores scroll position from location state", () => {
		const scrollToSpy = vi
			.spyOn(window, "scrollTo")
			.mockImplementation((_x, y) => {
				Object.defineProperty(window, "scrollY", {
					value: y,
					writable: true,
				});
			});
		const rafSpy = vi
			.spyOn(window, "requestAnimationFrame")
			.mockImplementation((cb) => {
				cb(0);
				return 0;
			});

		const store = createStore();
		const wrapper = createWrapper(store, { restoreScrollY: 500 });
		renderHook(() => useRestoreScroll(), { wrapper });

		expect(scrollToSpy).toHaveBeenCalledWith(0, 500);

		scrollToSpy.mockRestore();
		rafSpy.mockRestore();
		Object.defineProperty(window, "scrollY", { value: 0, writable: true });
	});
});

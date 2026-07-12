import { createTestQueryClient } from "@/test/test-utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { Provider as JotaiProvider, createStore } from "jotai";
import type { ReactNode } from "react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { MAX_RECENT, recentSearchesAtom } from "./recentSearchesAtoms";
import { useUnifiedSearch } from "./useUnifiedSearch";

function createWrapper(store: ReturnType<typeof createStore>) {
	return function Wrapper({ children }: { children: ReactNode }) {
		const qc = createTestQueryClient();
		return createElement(
			MemoryRouter,
			{ initialEntries: ["/"] },
			createElement(
				QueryClientProvider,
				{ client: qc },
				createElement(JotaiProvider, { store }, children),
			),
		);
	};
}

beforeEach(() => {
	localStorage.removeItem("recentSearches");
});

describe("recent searches", () => {
	test("recordHit stores the picked hit with a timestamp", () => {
		const store = createStore();
		const { result } = renderHook(() => useUnifiedSearch("songs"), {
			wrapper: createWrapper(store),
		});

		act(() => {
			result.current.recordHit({
				section: "songs",
				href: "/songs/42",
				label: "Acclamez le Dieu d'Abraham",
				sublabel: "#42",
			});
		});

		const recents = store.get(recentSearchesAtom);
		expect(recents.length).toBe(1);
		expect(recents[0].label).toBe("Acclamez le Dieu d'Abraham");
		expect(recents[0].href).toBe("/songs/42");
		expect(typeof recents[0].pickedAt).toBe("number");
	});

	test("deduplicates by href and bumps the re-picked hit to the top", () => {
		const store = createStore();
		const { result } = renderHook(() => useUnifiedSearch("songs"), {
			wrapper: createWrapper(store),
		});

		act(() => {
			result.current.recordHit({
				section: "songs",
				href: "/songs/1",
				label: "A",
			});
		});
		act(() => {
			result.current.recordHit({
				section: "songs",
				href: "/songs/2",
				label: "B",
			});
		});
		act(() => {
			result.current.recordHit({
				section: "songs",
				href: "/songs/1",
				label: "A",
			});
		});

		const recents = store.get(recentSearchesAtom);
		expect(recents.length).toBe(2);
		expect(recents[0].href).toBe("/songs/1");
		expect(recents[1].href).toBe("/songs/2");
	});

	test(`caps at ${MAX_RECENT} entries`, () => {
		const store = createStore();
		const { result } = renderHook(() => useUnifiedSearch("songs"), {
			wrapper: createWrapper(store),
		});

		for (let i = 1; i <= MAX_RECENT + 2; i++) {
			act(() => {
				result.current.recordHit({
					section: "songs",
					href: `/songs/${i}`,
					label: `Song ${i}`,
				});
			});
		}

		const recents = store.get(recentSearchesAtom);
		expect(recents.length).toBe(MAX_RECENT);
		expect(recents.find((r) => r.href === "/songs/1")).toBeUndefined();
	});

	test("removeRecent drops a single entry, clearRecents empties the list", () => {
		const store = createStore();
		const { result } = renderHook(() => useUnifiedSearch("songs"), {
			wrapper: createWrapper(store),
		});

		act(() => {
			result.current.recordHit({
				section: "songs",
				href: "/songs/1",
				label: "A",
			});
			result.current.recordHit({
				section: "texts",
				href: "/texts/9",
				label: "B",
			});
		});

		act(() => {
			result.current.removeRecent("/songs/1");
		});
		expect(store.get(recentSearchesAtom).map((r) => r.href)).toEqual([
			"/texts/9",
		]);

		act(() => {
			result.current.clearRecents();
		});
		expect(store.get(recentSearchesAtom).length).toBe(0);
	});
});

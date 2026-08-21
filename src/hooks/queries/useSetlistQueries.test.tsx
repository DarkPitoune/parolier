import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
	useAllSetlists,
	useSetlist,
	useSetlistItemsCached,
} from "./useSetlistQueries";

vi.mock("@/utils/supabase", () => ({
	allSetlistsQuery: vi.fn(),
	setlistQuery: vi.fn(),
	setlistItemsQuery: vi.fn(),
	supabaseUrl: "https://test.supabase.co",
	default: {},
}));

import {
	allSetlistsQuery,
	setlistItemsQuery,
	setlistQuery,
} from "@/utils/supabase";

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return {
		queryClient,
		wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	};
}

describe("useSetlistQueries", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("useAllSetlists", () => {
		it("fetches every time (staleTime=0)", async () => {
			vi.mocked(allSetlistsQuery).mockResolvedValue({
				data: [{ id: 1, name: "Sunday" }],
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useAllSetlists(), { wrapper });

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual([{ id: 1, name: "Sunday" }]);
		});
	});

	describe("useSetlist", () => {
		it("is disabled when setlistId is undefined", () => {
			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlist(undefined), { wrapper });

			expect(result.current.fetchStatus).toBe("idle");
		});

		it("fetches when setlistId is provided", async () => {
			const mockSetlist = [{ id: 1, songs: null, text: null, position: 1 }];
			vi.mocked(setlistQuery).mockResolvedValue({
				data: mockSetlist,
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlist("abc"), { wrapper });

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(setlistQuery).toHaveBeenCalledWith("abc");
		});
	});

	describe("useSetlistItemsCached", () => {
		it("is disabled when setlistId is undefined", () => {
			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistItemsCached(undefined), {
				wrapper,
			});
			expect(result.current.fetchStatus).toBe("idle");
		});

		it("fetches when setlistId is provided", async () => {
			vi.mocked(setlistItemsQuery).mockResolvedValue({
				data: [{ id: 1, position: 0, songs: { id: 42, title: "Song" } }],
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistItemsCached("abc"), {
				wrapper,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(setlistItemsQuery).toHaveBeenCalledWith("abc");
		});

		// A step is an index into this array, so the order has to be the one
		// sortSetlistItems defines — position first, id to break the ties that
		// duplicate positions leave behind.
		it("orders items by position, then id", async () => {
			vi.mocked(setlistItemsQuery).mockResolvedValue({
				data: [
					{ id: 30, position: 5 },
					{ id: 10, position: 1 },
					{ id: 25, position: 5 },
					{ id: 20, position: 3 },
				],
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistItemsCached("abc"), {
				wrapper,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data?.map((item) => item.id)).toEqual([
				10, 20, 25, 30,
			]);
		});

		it("returns an empty list when the setlist has no items", async () => {
			vi.mocked(setlistItemsQuery).mockResolvedValue({
				data: [],
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistItemsCached("abc"), {
				wrapper,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual([]);
		});
	});
});

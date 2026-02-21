import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
	useAllSetlists,
	useSetlist,
	useSetlistLength,
	useSetlistStep,
} from "./useSetlistQueries";

vi.mock("@/utils/supabase", () => ({
	allSetlistsQuery: vi.fn(),
	setlistQuery: vi.fn(),
	taggedSongFromSetlistStepQuery: vi.fn(),
	setlistLengthQuery: vi.fn(),
	supabaseUrl: "https://test.supabase.co",
	default: {},
}));

import {
	allSetlistsQuery,
	setlistLengthQuery,
	setlistQuery,
	taggedSongFromSetlistStepQuery,
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

	describe("useSetlistStep", () => {
		it("is disabled when setlistId is undefined", () => {
			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistStep(undefined, 1), {
				wrapper,
			});
			expect(result.current.fetchStatus).toBe("idle");
		});

		it("is disabled when stepNumber is undefined", () => {
			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistStep("abc", undefined), {
				wrapper,
			});
			expect(result.current.fetchStatus).toBe("idle");
		});

		it("fetches when both params are provided", async () => {
			vi.mocked(taggedSongFromSetlistStepQuery).mockResolvedValue({
				data: { id: 1, songs: { id: 42, title: "Song" } },
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistStep("abc", 2), {
				wrapper,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(taggedSongFromSetlistStepQuery).toHaveBeenCalledWith("abc", 2);
		});
	});

	describe("useSetlistLength", () => {
		it("is disabled when setlistId is undefined", () => {
			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistLength(undefined), {
				wrapper,
			});
			expect(result.current.fetchStatus).toBe("idle");
		});

		it("extracts position from result", async () => {
			vi.mocked(setlistLengthQuery).mockResolvedValue({
				data: [{ position: 7 }],
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistLength("abc"), {
				wrapper,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toBe(7);
		});

		it("returns 0 when no items", async () => {
			vi.mocked(setlistLengthQuery).mockResolvedValue({
				data: [],
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useSetlistLength("abc"), {
				wrapper,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toBe(0);
		});
	});
});

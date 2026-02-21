import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
	useAllSongs,
	usePrefetchAllSongs,
	useTaggedSong,
} from "./useSongQueries";

vi.mock("@/utils/supabase", () => ({
	allSongsQuery: vi.fn(),
	taggedSongQuery: vi.fn(),
	allTaggedSongsQuery: vi.fn(),
	allTagsQuery: vi.fn(),
	supabaseUrl: "https://test.supabase.co",
	default: {},
}));

import {
	allSongsQuery,
	allTaggedSongsQuery,
	taggedSongQuery,
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

describe("useSongQueries", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("useAllSongs", () => {
		it("returns data on success", async () => {
			const mockSongs = [
				{ id: 1, title: "Song A", tags: [] },
				{ id: 2, title: "Song B", tags: [] },
			];
			vi.mocked(allSongsQuery).mockResolvedValue({
				data: mockSongs,
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useAllSongs(), { wrapper });

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual(mockSongs);
		});

		it("throws on error", async () => {
			vi.mocked(allSongsQuery).mockResolvedValue({
				data: null,
				error: { message: "DB error" },
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useAllSongs(), { wrapper });

			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(result.current.error).toEqual({ message: "DB error" });
		});
	});

	describe("useTaggedSong", () => {
		it("is disabled when songId is undefined", () => {
			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useTaggedSong(undefined), {
				wrapper,
			});

			expect(result.current.fetchStatus).toBe("idle");
		});

		it("fetches and returns song when songId is provided", async () => {
			const mockSong = { id: 42, title: "Test Song", tags: [], strophes: [] };
			vi.mocked(taggedSongQuery).mockResolvedValue({
				data: mockSong,
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useTaggedSong(42), { wrapper });

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toEqual(mockSong);
			expect(taggedSongQuery).toHaveBeenCalledWith(42);
		});
	});

	describe("usePrefetchAllSongs", () => {
		it("seeds individual song detail caches", async () => {
			const mockSongs = [
				{
					id: 1,
					title: "A",
					tags: [{ id: 1, name: "tag1", svg: null, color: null }],
				},
				{ id: 2, title: "B", tags: [] },
			];

			let resolveQuery!: (val: unknown) => void;
			const queryPromise = new Promise((r) => {
				resolveQuery = r;
			});
			vi.mocked(allTaggedSongsQuery).mockReturnValue(queryPromise as never);

			const { wrapper, queryClient } = createWrapper();
			renderHook(() => usePrefetchAllSongs(), { wrapper });

			// Now resolve the mock and flush
			await act(async () => {
				resolveQuery({ data: mockSongs, error: null });
			});

			expect(allTaggedSongsQuery).toHaveBeenCalled();
			expect(queryClient.getQueryData(["songs", 1])).toBeDefined();
			expect(queryClient.getQueryData(["songs", 2])).toBeDefined();
			expect(queryClient.getQueryData(["songs", "list"])).toBeDefined();
		});
	});
});

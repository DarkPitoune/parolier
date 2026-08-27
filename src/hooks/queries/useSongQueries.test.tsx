import {
	QueryClient,
	QueryClientProvider,
	onlineManager,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
	useAllSongs,
	usePrefetchAllSongs,
	useSaveSongEdit,
	useSetStropheNote,
	useSongsRealtimeSync,
	useTaggedSong,
	useTaggedSongs,
} from "./useSongQueries";

// biome-ignore lint/suspicious/noExplicitAny: test double for the realtime callback signature
let realtimeCallback: ((payload: any) => void) | undefined;
const mockChannel = {
	on: vi.fn(
		(_event: string, _filter: unknown, callback: typeof realtimeCallback) => {
			realtimeCallback = callback;
			return mockChannel;
		},
	),
	subscribe: vi.fn(),
	unsubscribe: vi.fn(),
};

const mockSongTagTable = {
	delete: vi.fn(() => mockSongTagTable),
	insert: vi.fn(() => Promise.resolve({ error: null })),
	eq: vi.fn(() => Promise.resolve({ error: null })),
};

vi.mock("@/utils/supabase", () => ({
	allSongsQuery: vi.fn(),
	taggedSongQuery: vi.fn(),
	allTaggedSongsQuery: vi.fn(),
	allTagsQuery: vi.fn(),
	songStrophesQuery: vi.fn(),
	songStrophesMutation: vi.fn(),
	songEditMutation: vi.fn(),
	supabaseUrl: "https://test.supabase.co",
	default: {
		channel: vi.fn(() => mockChannel),
		from: vi.fn(() => mockSongTagTable),
	},
}));

vi.mock("react-hot-toast", () => ({
	default: { error: vi.fn(), success: vi.fn() },
}));

import type { Strophe } from "@/assets/types";
import { queryKeys } from "@/utils/queryKeys";
import {
	allSongsQuery,
	allTaggedSongsQuery,
	songEditMutation,
	songStrophesMutation,
	songStrophesQuery,
	taggedSongQuery,
} from "@/utils/supabase";

function createWrapper() {
	const queryClient = new QueryClient({
		// gcTime must not be 0: several tests read the cache after an `await`, and an
		// entry with no mounted observer is garbage-collected the moment the test yields.
		defaultOptions: {
			queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
		},
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

	describe("useTaggedSongs", () => {
		it("keys results by song id and reads the same cache as useTaggedSong", async () => {
			const cached = { id: 7, title: "Seeded", tags: [], strophes: [] };
			vi.mocked(taggedSongQuery).mockResolvedValue({
				data: { id: 9, title: "Fetched", tags: [], strophes: [] },
				error: null,
			} as never);

			const { wrapper, queryClient } = createWrapper();
			// Seeded exactly the way usePrefetchAllSongs seeds it.
			queryClient.setQueryData(queryKeys.songs.detail(7), cached);

			const { result } = renderHook(() => useTaggedSongs([7, 9]), { wrapper });

			await waitFor(() => expect(result.current.size).toBe(2));
			expect(result.current.get(7)).toEqual(cached);
			expect(result.current.get(9)?.title).toBe("Fetched");
			// The seeded song was served from cache, not refetched.
			expect(taggedSongQuery).not.toHaveBeenCalledWith(7);
		});

		it("collapses a song listed twice into one query", async () => {
			vi.mocked(taggedSongQuery).mockResolvedValue({
				data: { id: 3, title: "Twice", tags: [], strophes: [] },
				error: null,
			} as never);

			const { wrapper } = createWrapper();
			const { result } = renderHook(() => useTaggedSongs([3, 3]), { wrapper });

			await waitFor(() => expect(result.current.size).toBe(1));
			expect(result.current.get(3)?.title).toBe("Twice");
			expect(taggedSongQuery).toHaveBeenCalledTimes(1);
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

		it("does not seed over a song written while it was in flight", async () => {
			const mockSongs = [
				{ id: 1, title: "A", tags: [], strophes: [] },
				{ id: 2, title: "B", tags: [], strophes: [] },
			];

			let resolveQuery!: (val: unknown) => void;
			const queryPromise = new Promise((r) => {
				resolveQuery = r;
			});
			vi.mocked(allTaggedSongsQuery).mockReturnValue(queryPromise as never);

			const queryClient = new QueryClient({
				defaultOptions: {
					queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
				},
			});
			const wrapper = ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			);
			renderHook(() => usePrefetchAllSongs(), { wrapper });

			// A note saved on song 1 while the batch is still on the wire.
			const justSaved = { id: 1, title: "A", tags: [], strophes: ["noté"] };
			queryClient.setQueryData(queryKeys.songs.detail(1), justSaved);

			await act(async () => {
				resolveQuery({ data: mockSongs, error: null });
			});

			// The fresh write survives...
			expect(queryClient.getQueryData(queryKeys.songs.detail(1))).toEqual(
				justSaved,
			);
			// ...and the guard has not disabled seeding for everything else.
			expect(queryClient.getQueryData(queryKeys.songs.detail(2))).toEqual(
				mockSongs[1],
			);
		});
	});
});

describe("useSetStropheNote", () => {
	// The shared wrapper uses gcTime 0, which drops anything seeded with
	// setQueryData before the assertions can read it back.
	function createNoteWrapper() {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
				// The hook sets its own retry policy; only the delay is ours to zero.
				mutations: { retryDelay: 0 },
			},
		});
		return {
			queryClient,
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			),
		};
	}

	const server = (text: string): Strophe[] => [
		{ content: [{ text, chords: "Em" }], type: "verse", repetition: false },
	];
	const note = { who: ["🥁"], how: [] };

	const save = (result: { current: ReturnType<typeof useSetStropheNote> }) =>
		act(() => {
			result.current.mutate({
				songId: 1,
				stropheIndex: 0,
				note,
				expectedFingerprint: "lyric:Tu es là",
			});
		});

	beforeEach(() => {
		// This describe is a sibling of the one above, so its clearAllMocks
		// does not reach here and call counts would accumulate across tests.
		vi.clearAllMocks();
		vi.mocked(songStrophesQuery).mockResolvedValue({
			data: { strophes: server("Tu es là") },
			error: null,
		} as never);
		vi.mocked(songStrophesMutation).mockImplementation(
			async (_id, strophes) => ({ data: { strophes }, error: null }) as never,
		);
	});

	it("writes the server's array, not a stale cached one", async () => {
		const { wrapper, queryClient } = createNoteWrapper();
		// A phone open since this morning holds an outdated strophes array.
		queryClient.setQueryData(queryKeys.songs.detail(1), {
			id: 1,
			strophes: server("vieilles paroles"),
		});

		const { result } = renderHook(() => useSetStropheNote(), { wrapper });
		save(result);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const written = vi.mocked(songStrophesMutation).mock.calls[0][1];
		expect(written[0]).toMatchObject({
			content: [{ text: "Tu es là", chords: "Em" }],
			note,
		});
	});

	it("refuses to write when the strophe has moved", async () => {
		const { wrapper } = createNoteWrapper();
		const { result } = renderHook(() => useSetStropheNote(), { wrapper });

		act(() => {
			result.current.mutate({
				songId: 1,
				stropheIndex: 0,
				note,
				expectedFingerprint: "lyric:une autre strophe",
			});
		});
		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(songStrophesMutation).not.toHaveBeenCalled();
		// Deterministic failure — retrying it would only delay the toast.
		expect(vi.mocked(songStrophesQuery)).toHaveBeenCalledTimes(1);
	});

	it("rolls the cache back when the write fails", async () => {
		vi.mocked(songStrophesMutation).mockResolvedValue({
			data: null,
			error: { message: "boom" },
		} as never);
		const { wrapper, queryClient } = createNoteWrapper();
		const before = { id: 1, strophes: server("Tu es là") };
		queryClient.setQueryData(queryKeys.songs.detail(1), before);

		const { result } = renderHook(() => useSetStropheNote(), { wrapper });
		save(result);
		// A network failure is retried twice before it gives up.
		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 8000,
		});

		expect(vi.mocked(songStrophesMutation)).toHaveBeenCalledTimes(3);
		expect(queryClient.getQueryData(queryKeys.songs.detail(1))).toEqual(before);
	});

	it("queues instead of failing when the app is offline", async () => {
		// connectivityMonitor flips onlineManager off on a failed probe. The
		// write must then wait, and SongPage reads isPaused to say so — the
		// sheet must never block on isPending, which would hang forever.
		onlineManager.setOnline(false);
		try {
			const { wrapper } = createNoteWrapper();
			const { result } = renderHook(() => useSetStropheNote(), { wrapper });
			save(result);

			await waitFor(() => expect(result.current.isPaused).toBe(true));
			expect(songStrophesQuery).not.toHaveBeenCalled();
		} finally {
			onlineManager.setOnline(true);
		}
	});

	it("patches the caches instead of invalidating them", async () => {
		const { wrapper, queryClient } = createNoteWrapper();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		queryClient.setQueryData(queryKeys.songs.detail(1), {
			id: 1,
			strophes: server("Tu es là"),
		});
		queryClient.setQueryData(queryKeys.songs.allTagged(), [
			{ id: 1, strophes: server("Tu es là") },
		]);

		const { result } = renderHook(() => useSetStropheNote(), { wrapper });
		save(result);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const detail = queryClient.getQueryData(queryKeys.songs.detail(1)) as {
			strophes: Strophe[];
		};
		const all = queryClient.getQueryData(queryKeys.songs.allTagged()) as {
			strophes: Strophe[];
		}[];
		expect(detail.strophes[0]).toMatchObject({ note });
		expect(all[0].strophes[0]).toMatchObject({ note });
		// Invalidating allTagged would refetch every song's lyrics on bad wifi.
		expect(invalidate).not.toHaveBeenCalled();
	});
});

describe("useSaveSongEdit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSongTagTable.delete.mockImplementation(() => mockSongTagTable);
		mockSongTagTable.eq.mockResolvedValue({ error: null });
		mockSongTagTable.insert.mockResolvedValue({ error: null });
	});

	const draftStrophes: Strophe[] = [
		{
			content: [{ text: "Tu es là", chords: "Em" }],
			type: "verse",
			repetition: false,
		},
	];

	it("preserves a note added on the server since the editor loaded", async () => {
		vi.mocked(songStrophesQuery).mockResolvedValue({
			data: {
				strophes: [
					{
						content: [{ text: "Tu es là", chords: "Em" }],
						type: "verse",
						repetition: false,
						note: { who: ["🥁"], how: [] },
					},
				],
			},
			error: null,
		} as never);
		vi.mocked(songEditMutation).mockResolvedValue({ error: null } as never);
		const saved = { id: 1, title: "Titre", strophes: draftStrophes, tags: [] };
		vi.mocked(taggedSongQuery).mockResolvedValue({
			data: saved,
			error: null,
		} as never);

		const { wrapper, queryClient } = createWrapper();
		const { result } = renderHook(() => useSaveSongEdit(), { wrapper });

		act(() => {
			result.current.mutate({
				songId: 1,
				title: "Titre",
				sheetMusicUrl: null,
				strophes: draftStrophes,
				tagIds: [],
			});
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const written = vi.mocked(songEditMutation).mock.calls[0][1];
		expect(written.strophes[0]).toMatchObject({
			note: { who: ["🥁"], how: [] },
		});
		expect(queryClient.getQueryData(queryKeys.songs.detail(1))).toEqual(saved);
	});

	it("shows an error toast and leaves the cache untouched when the write fails", async () => {
		vi.mocked(songStrophesQuery).mockResolvedValue({
			data: { strophes: draftStrophes },
			error: null,
		} as never);
		vi.mocked(songEditMutation).mockResolvedValue({
			error: { message: "boom" },
		} as never);

		const { wrapper, queryClient } = createWrapper();
		queryClient.setQueryData(queryKeys.songs.detail(1), {
			id: 1,
			title: "Old",
		});

		const { result } = renderHook(() => useSaveSongEdit(), { wrapper });
		act(() => {
			result.current.mutate({
				songId: 1,
				title: "Titre",
				sheetMusicUrl: null,
				strophes: draftStrophes,
				tagIds: [],
			});
		});
		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(taggedSongQuery).not.toHaveBeenCalled();
		expect(queryClient.getQueryData(queryKeys.songs.detail(1))).toEqual({
			id: 1,
			title: "Old",
		});
	});
});

describe("useSongsRealtimeSync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		realtimeCallback = undefined;
	});

	it("subscribes to UPDATE events on songs", () => {
		const { wrapper } = createWrapper();
		renderHook(() => useSongsRealtimeSync(), { wrapper });

		expect(mockChannel.on).toHaveBeenCalledWith(
			"postgres_changes",
			expect.objectContaining({ table: "songs", event: "UPDATE" }),
			expect.any(Function),
		);
		expect(mockChannel.subscribe).toHaveBeenCalled();
	});

	it("patches an existing detail/allTagged cache entry when a broadcast arrives", () => {
		const { wrapper, queryClient } = createWrapper();
		queryClient.setQueryData(queryKeys.songs.detail(1), {
			id: 1,
			title: "Vieux titre",
			tags: [{ id: 1, name: "tag", svg: null, color: null }],
		});
		queryClient.setQueryData(queryKeys.songs.allTagged(), [
			{ id: 1, title: "Vieux titre", tags: [] },
		]);

		renderHook(() => useSongsRealtimeSync(), { wrapper });
		act(() => {
			realtimeCallback?.({ new: { id: 1, title: "Nouveau titre" } });
		});

		const detail = queryClient.getQueryData(queryKeys.songs.detail(1)) as {
			title: string;
			tags: unknown[];
		};
		expect(detail.title).toBe("Nouveau titre");
		// The broadcast row has no `tags` join — must not clobber it.
		expect(detail.tags).toEqual([
			{ id: 1, name: "tag", svg: null, color: null },
		]);
	});

	it("does not create a cache entry for a song nobody has fetched yet", () => {
		const { wrapper, queryClient } = createWrapper();
		renderHook(() => useSongsRealtimeSync(), { wrapper });

		act(() => {
			realtimeCallback?.({ new: { id: 99, title: "Inconnu" } });
		});

		expect(
			queryClient.getQueryData(queryKeys.songs.detail(99)),
		).toBeUndefined();
	});

	it("unsubscribes on unmount", () => {
		const { wrapper } = createWrapper();
		const { unmount } = renderHook(() => useSongsRealtimeSync(), { wrapper });
		unmount();

		expect(mockChannel.unsubscribe).toHaveBeenCalled();
	});
});

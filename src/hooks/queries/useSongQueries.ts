import type { Strophe, StropheNote } from "@/assets/types";
import { queryKeys } from "@/utils/queryKeys";
import {
	preserveFreshNotes,
	setStropheNote,
	stropheFingerprint,
} from "@/utils/stropheNotes";
import supabase, {
	allOrdinaireSongsQuery,
	allOrdinairesQuery,
	allRefrainsQuery,
	allSongsQuery,
	allTaggedSongsQuery,
	allTagsQuery,
	ordinaireDetailQuery,
	songEditMutation,
	songStrophesMutation,
	songStrophesQuery,
	taggedSongQuery,
} from "@/utils/supabase";
import type {
	AllOrdinaireSongs,
	AllRefrains,
	AllSongs,
	AllTaggedSongs,
	TaggedSong,
} from "@/utils/supabase";
import {
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import type { Database } from "../../../database.types";

export const useAllSongs = () =>
	useQuery({
		queryKey: queryKeys.songs.list(),
		queryFn: async () => {
			const { data, error } = await allSongsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000, // 5 min
		gcTime: 24 * 60 * 60 * 1000, // 24h
	});

/**
 * The single owner of a song body. Anything that renders lyrics or notes reads
 * through this key — never through a copy embedded in another query's join —
 * so the write paths that patch it (useSetStropheNote, useSaveSongEdit,
 * useSongsRealtimeSync) are enough to keep every screen in step.
 */
const taggedSongQueryOptions = (songId: number) => ({
	queryKey: queryKeys.songs.detail(songId),
	queryFn: async () => {
		const { data, error } = await taggedSongQuery(songId);
		if (error) throw error;
		return data;
	},
	staleTime: 5 * 60 * 1000,
	gcTime: 24 * 60 * 60 * 1000,
});

export const useTaggedSong = (songId: number | undefined) =>
	useQuery({
		...taggedSongQueryOptions(songId as number),
		enabled: songId !== undefined,
	});

/**
 * Several song bodies at once, keyed by id — for a screen showing a whole
 * setlist. Normally every one of these is a cache hit, seeded at startup by
 * usePrefetchAllSongs; the individual fetches are the cold-start fallback.
 *
 * Ids are de-duplicated here rather than by each caller: a setlist may well
 * list the same song twice, and handing useQueries two identical keys makes it
 * warn about duplicate queries. Results are keyed off `data.id` rather than
 * zipped against `songIds` so that de-duplication can't misalign them.
 */
export const useTaggedSongs = (songIds: number[]) =>
	useQueries({
		queries: [...new Set(songIds)].map(taggedSongQueryOptions),
		combine: (results) => {
			const bySongId = new Map<number, TaggedSong>();
			for (const result of results)
				if (result.data) bySongId.set(result.data.id, result.data);
			return bySongId;
		},
	});

export const useAllTaggedSongs = () =>
	useQuery({
		queryKey: queryKeys.songs.allTagged(),
		queryFn: async () => {
			const { data, error } = await allTaggedSongsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useAllRefrains = () =>
	useQuery({
		queryKey: queryKeys.songs.refrainList(),
		queryFn: async () => {
			const { data, error } = await allRefrainsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useAllTags = () =>
	useQuery({
		queryKey: queryKeys.tags.all(),
		queryFn: async () => {
			const { data, error } = await allTagsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useAllOrdinaires = () =>
	useQuery({
		queryKey: queryKeys.ordinaires.list(),
		queryFn: async () => {
			const { data, error } = await allOrdinairesQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useOrdinaireDetail = (id: number | undefined) =>
	useQuery({
		queryKey: queryKeys.ordinaires.detail(id as number),
		queryFn: async () => {
			const { data, error } = await ordinaireDetailQuery(id as number);
			if (error) throw error;
			return data;
		},
		enabled: id !== undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

export const useAllOrdinaireSongs = () =>
	useQuery({
		queryKey: queryKeys.songs.ordinaireList(),
		queryFn: async () => {
			const { data, error } = await allOrdinaireSongsQuery();
			if (error) throw error;
			return data ?? [];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});

/** Thrown when the strophe a note was written against is no longer at that index. */
export const STROPHE_MOVED = "STROPHE_MOVED";

type SetStropheNoteVariables = {
	songId: number;
	/** Index into the ORIGINAL strophes array, never a visible position. */
	stropheIndex: number;
	/** `undefined` deletes the note. */
	note: StropheNote | undefined;
	/** Identity of the strophe as it was when the sheet opened. */
	expectedFingerprint: string;
};

/**
 * Writes one strophe's note.
 *
 * The whole strophes array has to go back, so the mutation re-reads it first
 * rather than trusting the cache: songs.detail is seeded once at startup with
 * a 24h gcTime and no refetch on focus, so a phone that opened the app this
 * morning would otherwise write this morning's lyrics over anything edited
 * since. The fingerprint then catches the case a re-read cannot — a strophe
 * inserted or removed meanwhile, which would silently move the target.
 *
 * (A jsonb_set RPC would be genuinely atomic. It is disproportionate for one
 * band, where the worst realistic case is redoing a single note.)
 *
 * The sheet closes without waiting on the mutation (see SongPage), so a
 * second note can be saved before the first one's read-modify-write lands.
 * Two overlapping calls would otherwise both read the array before either
 * writes, and the later write would erase the earlier note. `chain` forces
 * each call's read to wait for the previous call's write to finish.
 */
export const useSetStropheNote = () => {
	const queryClient = useQueryClient();
	const chain = useRef<Promise<unknown>>(Promise.resolve());
	// Tracks the most recently issued call per strophe. A slow call's
	// success/error can land after a newer edit to the same strophe already
	// applied its own optimistic update — without this, the older call would
	// patch or roll back the cache with a snapshot taken before that newer
	// edit existed, making the display regress even though the badge shows
	// "saved".
	const latestAttempt = useRef<Map<string, number>>(new Map());

	return useMutation({
		mutationFn: ({
			songId,
			stropheIndex,
			note,
			expectedFingerprint,
		}: SetStropheNoteVariables) => {
			const run = async () => {
				const { data: fresh, error: readError } =
					await songStrophesQuery(songId);
				if (readError) throw readError;

				const current = (fresh?.strophes ?? []) as Strophe[];
				if (stropheFingerprint(current[stropheIndex]) !== expectedFingerprint)
					throw new Error(STROPHE_MOVED);

				const next = setStropheNote(current, stropheIndex, note);
				const { data, error } = await songStrophesMutation(songId, next);
				if (error) throw error;

				return { songId, strophes: (data?.strophes ?? next) as Strophe[] };
			};

			// Run after the previous call settles, whichever way it went, so
			// one rejection doesn't stall every save that follows it.
			const result = chain.current.then(run, run);
			chain.current = result.catch(() => {});
			return result;
		},
		// The connectivity probe only runs every 30s, so the app can believe it
		// is online while the wifi is already gone — a transient failure is
		// worth retrying. A moved strophe is not: it will mismatch every time,
		// so retrying only delays the toast the user needs to see.
		retry: (failureCount, error) =>
			error instanceof Error && error.message === STROPHE_MOVED
				? false
				: failureCount < 2,
		onMutate: async ({ songId, stropheIndex, note }) => {
			const key = queryKeys.songs.detail(songId);
			await queryClient.cancelQueries({ queryKey: key });
			const previous = queryClient.getQueryData<TaggedSong>(key);

			const attemptKey = `${songId}:${stropheIndex}`;
			const attempt = (latestAttempt.current.get(attemptKey) ?? 0) + 1;
			latestAttempt.current.set(attemptKey, attempt);

			if (previous?.strophes)
				queryClient.setQueryData<TaggedSong>(key, {
					...previous,
					strophes: setStropheNote(previous.strophes, stropheIndex, note),
				});

			return { previous, attemptKey, attempt };
		},
		onError: (error, { songId }, context) => {
			// A newer edit to this strophe superseded this call — its own
			// optimistic update (or confirmed save) is the current truth, so
			// don't roll back past it.
			const superseded =
				context &&
				latestAttempt.current.get(context.attemptKey) !== context.attempt;

			if (!superseded && context?.previous)
				queryClient.setQueryData(
					queryKeys.songs.detail(songId),
					context.previous,
				);
			// Optimism must never hide a failure.
			toast.error(
				error instanceof Error && error.message === STROPHE_MOVED
					? "La chanson a changé, rouvre la note"
					: "Note non enregistrée",
			);
		},
		onSuccess: ({ songId, strophes }, _variables, context) => {
			// Same guard: this call's read-modify-write may have read the
			// server before a newer edit to the same strophe existed, so its
			// returned array is stale relative to what's already in the
			// cache — skip patching and let the newer call's own success
			// confirm the cache instead.
			if (
				context &&
				latestAttempt.current.get(context.attemptKey) !== context.attempt
			)
				return;

			// Patch, don't invalidate: the write already returned the
			// authoritative array, and invalidating allTagged would refetch
			// every song's lyrics on church wifi.
			queryClient.setQueryData<TaggedSong>(
				queryKeys.songs.detail(songId),
				(old) => (old ? { ...old, strophes } : old),
			);
			queryClient.setQueryData<AllTaggedSongs>(
				queryKeys.songs.allTagged(),
				(old) => old?.map((s) => (s.id === songId ? { ...s, strophes } : s)),
			);
		},
	});
};

/**
 * Prefetches all song details in a single batch query and seeds
 * each individual song into the TanStack Query cache.
 * Call once at app startup — runs silently in background.
 */
export const usePrefetchAllSongs = () => {
	const queryClient = useQueryClient();

	useEffect(() => {
		const prefetch = async () => {
			const startedAt = Date.now();
			try {
				const { data, error } = await allTaggedSongsQuery();
				if (error || !data) return;

				// Seed each song into the individual detail cache
				for (const song of data) {
					const key = queryKeys.songs.detail(song.id);
					// A note saved while this batch was in flight is newer than
					// what it carries — seeding over it would make the note
					// vanish until the 5 min staleTime lapsed.
					const updatedAt = queryClient.getQueryState(key)?.dataUpdatedAt ?? 0;
					// `>=`, not `>`: a note written in the same millisecond the
					// prefetch started must win. Skipping an entry that is merely
					// simultaneous is harmless — it already holds data.
					if (updatedAt >= startedAt) continue;
					queryClient.setQueryData(key, song);
				}

				// Seed the song list cache (only songs, stripped to list fields)
				queryClient.setQueryData(
					queryKeys.songs.list(),
					data
						.filter((s) => (s.type ?? "song") === "song")
						.map(({ id, title, type, tags }) => ({ id, title, type, tags })),
				);

				// Seed the refrain list cache
				queryClient.setQueryData(
					queryKeys.songs.refrainList(),
					data
						.filter((s) => s.type === "refrain")
						.map(({ id, title, type, tags }) => ({ id, title, type, tags })),
				);

				// Seed the ordinaire song list cache
				queryClient.setQueryData(
					queryKeys.songs.ordinaireList(),
					data
						.filter((s) => s.type === "ordinaire")
						.map(({ id, title, type, tags, ...rest }) => ({
							id,
							title,
							type,
							tags,
							ordinaire_id: "ordinaire_id" in rest ? rest.ordinaire_id : null,
							ordinaire_role:
								"ordinaire_role" in rest ? rest.ordinaire_role : null,
						})),
				);
			} catch {
				// Silent failure — offline or bad network, SW cache will serve
			}
		};

		prefetch();
	}, [queryClient]);
};

type SaveSongEditVariables = {
	songId: number;
	title: string;
	sheetMusicUrl: string | null;
	strophes: Strophe[];
	tagIds: number[];
};

/** Patches the {id, title, tags} shape shared by the three list-projection caches. */
function patchListEntry<T extends { id: number; title: string; tags: unknown }>(
	entries: T[] | undefined,
	saved: TaggedSong,
) {
	return entries?.map((entry) =>
		entry.id === saved.id
			? { ...entry, title: saved.title, tags: saved.tags }
			: entry,
	);
}

/**
 * Saves the song editor's draft (title, sheet music, strophes, tags).
 *
 * Re-reads the strophes column immediately before writing and merges in
 * whatever notes are currently on the server (see preserveFreshNotes) —
 * the editor's own draft was loaded whenever the page was opened and never
 * lets a user touch notes, so trusting it for that one field would silently
 * erase a note someone else added, changed or deleted while this tab was
 * open. This is the editor's counterpart to useSetStropheNote's fingerprint
 * check: same problem (the cache/draft can be stale relative to the DB),
 * solved per-field instead of per-strophe because the editor writes many
 * fields at once and needs the strophes it doesn't own to survive intact.
 *
 * Ends with a full re-fetch rather than trusting the update's own response,
 * since tags are written as a separate delete+insert and the cache should
 * reflect the truly final row.
 */
export const useSaveSongEdit = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			songId,
			title,
			sheetMusicUrl,
			strophes,
			tagIds,
		}: SaveSongEditVariables) => {
			const { data: fresh, error: readError } = await songStrophesQuery(songId);
			if (readError) throw readError;

			const merged = preserveFreshNotes(
				(fresh?.strophes ?? []) as Strophe[],
				strophes,
			);

			const { error: songError } = await songEditMutation(songId, {
				title,
				sheet_music_url: sheetMusicUrl,
				strophes: merged,
			});
			if (songError) throw songError;

			const { error: deleteError } = await supabase
				.from("song_tag")
				.delete()
				.eq("song_id", songId);
			if (deleteError) throw deleteError;

			if (tagIds.length > 0) {
				const { error: insertError } = await supabase
					.from("song_tag")
					.insert(tagIds.map((tagId) => ({ song_id: songId, tag_id: tagId })));
				if (insertError) throw insertError;
			}

			const { data, error } = await taggedSongQuery(songId);
			if (error) throw error;
			return data;
		},
		onSuccess: (saved) => {
			queryClient.setQueryData<TaggedSong>(
				queryKeys.songs.detail(saved.id),
				saved,
			);
			queryClient.setQueryData<AllTaggedSongs>(
				queryKeys.songs.allTagged(),
				(old) => old?.map((s) => (s.id === saved.id ? saved : s)),
			);
			queryClient.setQueryData<AllSongs>(queryKeys.songs.list(), (old) =>
				patchListEntry(old, saved),
			);
			queryClient.setQueryData<AllRefrains>(
				queryKeys.songs.refrainList(),
				(old) => patchListEntry(old, saved),
			);
			queryClient.setQueryData<AllOrdinaireSongs>(
				queryKeys.songs.ordinaireList(),
				(old) => patchListEntry(old, saved),
			);
			toast.success("Modifications enregistrées");
		},
		onError: () => {
			toast.error("Modifications non enregistrées");
		},
	});
};

/**
 * Pushes song content changes (lyrics, notes, title, ...) to every open tab
 * and device the moment they land in the DB, instead of relying on the 5 min
 * staleTime/24h gcTime to eventually notice. Mounted once at app root.
 *
 * Patches existing cache entries only (`old ? … : old`) — never seeds a song
 * nobody has fetched yet, since the broadcast row lacks the `tags` join and
 * a bare insert would show it as tagless until the next real fetch.
 */
export const useSongsRealtimeSync = () => {
	const queryClient = useQueryClient();

	useEffect(() => {
		const channel = supabase
			.channel("songs-realtime")
			.on(
				"postgres_changes",
				{ schema: "public", table: "songs", event: "UPDATE" },
				(payload) => {
					const row = (
						payload as unknown as {
							new: Database["public"]["Tables"]["songs"]["Row"];
						}
					).new;

					queryClient.setQueryData<TaggedSong>(
						queryKeys.songs.detail(row.id),
						(old) => (old ? { ...old, ...row } : old),
					);
					queryClient.setQueryData<AllTaggedSongs>(
						queryKeys.songs.allTagged(),
						(old) => old?.map((s) => (s.id === row.id ? { ...s, ...row } : s)),
					);
					const titlePatch = <T extends { id: number; title: string }>(
						entries: T[] | undefined,
					) =>
						entries?.map((s) =>
							s.id === row.id ? { ...s, title: row.title } : s,
						);
					queryClient.setQueryData<AllSongs>(queryKeys.songs.list(), (old) =>
						titlePatch(old),
					);
					queryClient.setQueryData<AllRefrains>(
						queryKeys.songs.refrainList(),
						(old) => titlePatch(old),
					);
					queryClient.setQueryData<AllOrdinaireSongs>(
						queryKeys.songs.ordinaireList(),
						(old) => titlePatch(old),
					);
				},
			);
		channel.subscribe();

		return () => {
			channel.unsubscribe();
		};
	}, [queryClient]);
};

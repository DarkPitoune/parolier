import type { Strophe, StropheNote } from "@/assets/types";
import { queryKeys } from "@/utils/queryKeys";
import { setStropheNote, stropheFingerprint } from "@/utils/stropheNotes";
import {
	allOrdinaireSongsQuery,
	allOrdinairesQuery,
	allRefrainsQuery,
	allSongsQuery,
	allTaggedSongsQuery,
	allTagsQuery,
	ordinaireDetailQuery,
	songStrophesMutation,
	songStrophesQuery,
	taggedSongQuery,
} from "@/utils/supabase";
import type { AllTaggedSongs, TaggedSong } from "@/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

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

export const useTaggedSong = (songId: number | undefined) =>
	useQuery({
		queryKey: queryKeys.songs.detail(songId as number),
		queryFn: async () => {
			const { data, error } = await taggedSongQuery(songId as number);
			if (error) throw error;
			return data;
		},
		enabled: songId !== undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
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

			if (previous?.strophes)
				queryClient.setQueryData<TaggedSong>(key, {
					...previous,
					strophes: setStropheNote(previous.strophes, stropheIndex, note),
				});

			return { previous };
		},
		onError: (error, { songId }, context) => {
			if (context?.previous)
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
		onSuccess: ({ songId, strophes }) => {
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

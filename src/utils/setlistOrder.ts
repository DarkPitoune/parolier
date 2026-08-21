/**
 * The single ordering of a setlist's items — and therefore the meaning of a
 * setlist *step*: a step is an index into this array.
 *
 * `position` is only a sort key, never an address. It is not dense (deleting an
 * item leaves a hole, and appending at `items.length` can then collide with a
 * surviving higher position), so `id` breaks ties to keep the order stable
 * across queries — `setlistQuery` doesn't order server-side at all, and
 * `allSetlistItemsQuery` would otherwise resolve duplicate positions in
 * arbitrary row order. Every place that maps a step to an item must sort with
 * this, or the same URL means different items on different pages.
 */
export const sortSetlistItems = <T extends { position: number; id: number }>(
	items: readonly T[],
): T[] => [...items].sort((a, b) => a.position - b.position || a.id - b.id);

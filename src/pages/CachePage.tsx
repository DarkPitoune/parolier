import { queryClient } from "@/utils/queryClient";
import { useEffect, useMemo, useReducer } from "react";

type CacheEntry = {
	key: string;
	status: string;
	updatedAt: string;
	age: string;
	dataSize: string;
	isStale: boolean;
};

function formatAge(ms: number): string {
	if (ms < 1000) return "just now";
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m ago`;
}

function formatSize(data: unknown): string {
	if (data === undefined) return "—";
	try {
		const bytes = JSON.stringify(data).length;
		if (bytes < 1024) return `${bytes} B`;
		return `${(bytes / 1024).toFixed(1)} KB`;
	} catch {
		return "?";
	}
}

function groupKey(key: readonly unknown[]): string {
	if (key[0] === "songs") return "songs";
	if (key[0] === "setlists") {
		if (key[2] === "step") return "setlist-steps";
		if (key[2] === "length") return "setlist-lengths";
		return "setlists";
	}
	if (key[0] === "tags") return "tags";
	if (key[0] === "texts") return "texts";
	return "other";
}

function getCacheEntries(): Map<string, CacheEntry[]> {
	const now = Date.now();
	const queries = queryClient.getQueryCache().getAll();
	const groups = new Map<string, CacheEntry[]>();

	for (const query of queries) {
		const key = query.queryKey;
		const state = query.state;
		const group = groupKey(key);

		const entry: CacheEntry = {
			key: JSON.stringify(key),
			status: state.status,
			updatedAt: state.dataUpdatedAt
				? new Date(state.dataUpdatedAt).toLocaleTimeString()
				: "—",
			age: state.dataUpdatedAt ? formatAge(now - state.dataUpdatedAt) : "—",
			dataSize: formatSize(state.data),
			isStale: query.isStale(),
		};

		const list = groups.get(group) ?? [];
		list.push(entry);
		groups.set(group, list);
	}

	return groups;
}

const CachePage = () => {
	// Force re-render on cache changes via a simple counter
	const [version, forceUpdate] = useReducer((x: number) => x + 1, 0);

	useEffect(() => {
		const unsubscribe = queryClient.getQueryCache().subscribe(forceUpdate);
		return unsubscribe;
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: getCacheEntries() reads the cache imperatively, so `version` is the only recompute trigger
	const groups = useMemo(() => getCacheEntries(), [version]);

	const totalEntries = Array.from(groups.values()).reduce(
		(sum, list) => sum + list.length,
		0,
	);

	return (
		<div className="max-w-4xl mx-auto p-4 font-mono text-sm">
			<h1 className="text-xl font-bold mb-4 dark:text-white">
				Cache Debug — {totalEntries} entries
			</h1>

			{Array.from(groups.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([group, entries]) => (
					<details key={group} className="mb-4" open>
						<summary className="cursor-pointer font-bold text-lg dark:text-white">
							{group}{" "}
							<span className="text-gray-500 font-normal">
								({entries.length})
							</span>
						</summary>
						<table className="w-full mt-2 border-collapse">
							<thead>
								<tr className="text-left text-gray-500 border-b border-gray-300 dark:border-gray-600">
									<th className="py-1 pr-2">Key</th>
									<th className="py-1 pr-2">Status</th>
									<th className="py-1 pr-2">Updated</th>
									<th className="py-1 pr-2">Age</th>
									<th className="py-1 pr-2">Size</th>
									<th className="py-1">Stale</th>
								</tr>
							</thead>
							<tbody>
								{entries.map((entry) => (
									<tr
										key={entry.key}
										className="border-b border-gray-200 dark:border-gray-700 dark:text-gray-300"
									>
										<td className="py-1 pr-2 max-w-xs truncate">{entry.key}</td>
										<td className="py-1 pr-2">
											<span
												className={
													entry.status === "success"
														? "text-green-600"
														: entry.status === "error"
															? "text-red-600"
															: "text-yellow-600"
												}
											>
												{entry.status}
											</span>
										</td>
										<td className="py-1 pr-2">{entry.updatedAt}</td>
										<td className="py-1 pr-2">{entry.age}</td>
										<td className="py-1 pr-2">{entry.dataSize}</td>
										<td className="py-1">{entry.isStale ? "yes" : "no"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</details>
				))}
		</div>
	);
};

export { CachePage };

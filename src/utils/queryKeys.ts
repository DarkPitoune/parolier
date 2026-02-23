export const queryKeys = {
	songs: {
		list: () => ["songs", "list"] as const,
		detail: (id: number) => ["songs", id] as const,
	},
	tags: { all: () => ["tags"] as const },
	setlists: {
		list: () => ["setlists", "list"] as const,
		detail: (id: string) => ["setlists", id] as const,
		step: (setlistId: string, step: number) =>
			["setlists", setlistId, "step", step] as const,
		length: (id: string) => ["setlists", id, "length"] as const,
		name: (id: string) => ["setlists", id, "name"] as const,
	},
	texts: {
		list: () => ["texts", "list"] as const,
		detail: (id: number) => ["texts", id] as const,
	},
	analytics: {
		popular: (startDate?: string, endDate?: string) =>
			["analytics", "popular", startDate, endDate] as const,
	},
	messe: {
		byDate: (date: string) => ["messe", date] as const,
	},
	bible: {
		all: () => ["bible", "all"] as const,
	},
};

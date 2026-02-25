export const queryKeys = {
	songs: {
		list: () => ["songs", "list"] as const,
		refrainList: () => ["songs", "refrainList"] as const,
		ordinaireList: () => ["songs", "ordinaireList"] as const,
		detail: (id: number) => ["songs", id] as const,
		allTagged: () => ["songs", "allTagged"] as const,
	},
	tags: { all: () => ["tags"] as const },
	setlists: {
		list: () => ["setlists", "list"] as const,
		detail: (id: string) => ["setlists", id] as const,
		step: (setlistId: string, step: number) =>
			["setlists", setlistId, "step", step] as const,
		length: (id: string) => ["setlists", id, "length"] as const,
	},
	ordinaires: {
		list: () => ["ordinaires", "list"] as const,
		detail: (id: number) => ["ordinaires", id] as const,
	},
	texts: {
		list: () => ["texts", "list"] as const,
		detail: (id: number) => ["texts", id] as const,
	},
};

export interface Config {
	telegramToken: string;
	mistralApiKey: string;
	supabaseUrl: string;
	supabaseKey: string;
	allowedUsers: Map<number, string>;
	appUrl: string;
	cataloguePath: string;
	dailyMessageCap: number;
	model: string;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
	const value = env[name]?.trim();
	if (!value) throw new Error(`Missing environment variable ${name}`);
	return value;
}

export function parseAllowedUsers(raw: string): Map<number, string> {
	const users = new Map<number, string>();
	for (const entry of raw.split(",")) {
		const [id, name] = entry.trim().split(":");
		if (!id) continue;
		const numeric = Number(id);
		if (!Number.isSafeInteger(numeric)) {
			throw new Error(`ALLOWED_USERS: "${id}" is not a Telegram user id`);
		}
		users.set(numeric, name?.trim() || id);
	}
	return users;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
	return {
		telegramToken: required(env, "TELEGRAM_BOT_TOKEN"),
		mistralApiKey: required(env, "MISTRAL_API_KEY"),
		supabaseUrl: required(env, "SUPABASE_URL"),
		supabaseKey: required(env, "SUPABASE_KEY"),
		allowedUsers: parseAllowedUsers(env.ALLOWED_USERS ?? ""),
		appUrl: (env.APP_URL ?? "https://parolier.jubilate.fr").replace(/\/$/, ""),
		cataloguePath: env.CATALOGUE_PATH ?? "/catalogue/index.html",
		dailyMessageCap: Number(env.DAILY_MESSAGE_CAP ?? 40),
		model: env.MISTRAL_MODEL?.trim() || "mistral-large-latest",
	};
}

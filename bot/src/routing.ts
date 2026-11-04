import type { Message } from "grammy/types";

export interface BotIdentity {
	id: number;
	username: string;
}

const CALLED_BY_NAME = /^\s*(claude|parolier)\b[\s,:!.-]*/i;

export function isGroup(message: Message): boolean {
	return message.chat.type === "group" || message.chat.type === "supergroup";
}

export function messageText(message: Message): string {
	return message.text ?? message.caption ?? "";
}

/** In a group the bot only answers when called by name, mentioned, or replied to. */
export function isAddressed(message: Message, bot: BotIdentity): boolean {
	if (!isGroup(message)) return true;
	const text = messageText(message);
	if (CALLED_BY_NAME.test(text)) return true;
	if (text.toLowerCase().includes(`@${bot.username.toLowerCase()}`))
		return true;
	return message.reply_to_message?.from?.id === bot.id;
}

export function command(
	message: Message,
	bot: BotIdentity,
): string | undefined {
	const match = message.text?.match(/^\/([a-z]+)(?:@(\w+))?(?:\s|$)/i);
	if (!match?.[1]) return undefined;
	if (match[2] && match[2].toLowerCase() !== bot.username.toLowerCase())
		return undefined;
	return match[1].toLowerCase();
}

export function forwardedFrom(message: Message): string | undefined {
	const origin = message.forward_origin;
	if (!origin) return undefined;
	switch (origin.type) {
		case "user":
			return [origin.sender_user.first_name, origin.sender_user.last_name]
				.filter(Boolean)
				.join(" ");
		case "hidden_user":
			return origin.sender_user_name;
		case "chat":
			return origin.sender_chat.title ?? "un groupe";
		case "channel":
			return origin.chat.title ?? "une chaîne";
	}
}

export function splitForTelegram(text: string, limit = 4000): string[] {
	const parts: string[] = [];
	let rest = text;
	while (rest.length > limit) {
		const cut = Math.max(
			rest.lastIndexOf("\n", limit),
			rest.lastIndexOf(" ", limit),
		);
		const at = cut > limit / 2 ? cut : limit;
		parts.push(rest.slice(0, at).trimEnd());
		rest = rest.slice(at).trimStart();
	}
	if (rest) parts.push(rest);
	return parts;
}

export function frenchNow(
	date = new Date(),
	timeZone = "Europe/Paris",
): string {
	return new Intl.DateTimeFormat("fr-FR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone,
	}).format(date);
}

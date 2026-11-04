import type { Message } from "./agent";

/**
 * Per-chat conversation, kept in memory. It is only ever appended to or
 * dropped whole, never trimmed: cutting it could separate a tool result from
 * the call that asked for it, and it would no longer match the prompt cache.
 */
export class History {
	#chats = new Map<number, { messages: Message[]; lastUsed: number }>();

	constructor(
		private readonly idleMs = 2 * 60 * 60 * 1000,
		private readonly maxMessages = 80,
		private readonly now = () => Date.now(),
	) {}

	get(chatId: number): Message[] {
		const chat = this.#chats.get(chatId);
		if (!chat) return [];
		if (
			this.now() - chat.lastUsed > this.idleMs ||
			chat.messages.length > this.maxMessages
		) {
			this.#chats.delete(chatId);
			return [];
		}
		return chat.messages;
	}

	set(chatId: number, messages: Message[]): void {
		this.#chats.set(chatId, { messages, lastUsed: this.now() });
	}

	clear(chatId: number): void {
		this.#chats.delete(chatId);
	}
}

export class DailyCap {
	#counts = new Map<number, { day: string; count: number }>();

	constructor(
		private readonly limit: number,
		private readonly today = () => new Date().toISOString().slice(0, 10),
	) {}

	/** Counts one message; false once the user is past today's limit. */
	take(userId: number): boolean {
		const day = this.today();
		const entry = this.#counts.get(userId);
		const count = entry?.day === day ? entry.count + 1 : 1;
		this.#counts.set(userId, { day, count });
		return count <= this.limit;
	}
}

import type { ContentChunk } from "@mistralai/mistralai/models/components";
import { Bot, type Context, GrammyError } from "grammy";
import type { Message } from "grammy/types";
import { runTurn } from "./agent";
import type { Catalogue } from "./catalogue";
import type { Config } from "./config";
import { markdownToTelegramHtml, stripMarkdown } from "./format";
import { DailyCap, History } from "./history";
import {
	MAX_IMAGE_BYTES,
	MAX_PDF_BYTES,
	dataUrl,
	isImageType,
	sniffImageType,
} from "./media";
import { complete, makeMistral, pdfToText } from "./mistral";
import {
	type BotIdentity,
	command,
	forwardedFrom,
	frenchNow,
	isAddressed,
	isGroup,
	messageText,
	splitForTelegram,
} from "./routing";
import { makeDb } from "./supabase";
import { catalogueTools } from "./tools/catalogue";
import { SongIndex, type ToolContext } from "./tools/context";
import { ordinaireTools } from "./tools/ordinaires";
import { setlistTools } from "./tools/setlists";
import { songTools } from "./tools/songs";
import { webTools } from "./tools/web";

type Block = ContentChunk;

const image = (data: Buffer, type: string): Block => ({
	type: "image_url",
	imageUrl: dataUrl(data, type),
});

const ALBUM_WAIT_MS = 1500;

function describeAsk(content: Block[]): string {
	const text = content
		.slice(1)
		.map((c) =>
			c.type === "text"
				? c.text
				: `[${c.type === "image_url" ? "image" : c.type}]`,
		)
		.join(" ");
	return text.length > 600 ? `${text.slice(0, 600)}…` : text;
}

export function startBot(config: Config, catalogue: Catalogue): Bot {
	const bot = new Bot(config.telegramToken);
	const mistral = makeMistral(config.mistralApiKey);
	const history = new History();
	const cap = new DailyCap(config.dailyMessageCap);
	const songIndex = new SongIndex();
	const queues = new Map<number, Promise<void>>();
	const albums = new Map<
		string,
		{ messages: Message[]; timer: NodeJS.Timeout }
	>();
	let me: BotIdentity;

	const enqueue = (chatId: number, job: () => Promise<void>) => {
		const next = (queues.get(chatId) ?? Promise.resolve())
			.then(job)
			.catch((error) => {
				console.error(
					JSON.stringify({ event: "job_failed", chatId, error: String(error) }),
				);
			});
		queues.set(chatId, next);
	};

	async function download(
		fileId: string,
		maxBytes: number,
	): Promise<Buffer | string> {
		const file = await bot.api.getFile(fileId);
		if (!file.file_path) return "fichier indisponible";
		if (file.file_size && file.file_size > maxBytes) {
			return `fichier trop lourd (${Math.round(file.file_size / 1024 / 1024)} Mo)`;
		}
		const res = await fetch(
			`https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`,
		);
		if (!res.ok) return `téléchargement impossible (HTTP ${res.status})`;
		return Buffer.from(await res.arrayBuffer());
	}

	async function attachments(message: Message): Promise<Block[]> {
		const blocks: Block[] = [];
		const photo = message.photo?.at(-1);
		if (photo) {
			const data = await download(photo.file_id, MAX_IMAGE_BYTES);
			const type = typeof data === "string" ? undefined : sniffImageType(data);
			if (typeof data === "string" || !type)
				blocks.push({ type: "text", text: `[Photo non lisible : ${data}]` });
			else blocks.push(image(data, type));
		}
		const doc = message.document;
		if (doc) {
			const isPdf = doc.mime_type === "application/pdf";
			if (isImageType(doc.mime_type) || isPdf) {
				const data = await download(
					doc.file_id,
					isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES,
				);
				if (typeof data === "string")
					blocks.push({
						type: "text",
						text: `[${doc.file_name ?? "Fichier"} : ${data}]`,
					});
				else if (isPdf) {
					const text = await pdfToText(mistral, data);
					blocks.push({
						type: "text",
						text: `[PDF ${doc.file_name ?? ""}, lu par OCR]\n${text}`,
					});
				} else {
					const type = sniffImageType(data);
					blocks.push(
						type
							? image(data, type)
							: {
									type: "text",
									text: `[${doc.file_name} : image non lisible]`,
								},
					);
				}
			} else {
				blocks.push({
					type: "text",
					text: `[Fichier joint non pris en charge : ${doc.file_name ?? doc.mime_type}]`,
				});
			}
		}
		return blocks;
	}

	async function describe(message: Message, sender: string): Promise<Block[]> {
		const blocks: Block[] = [];
		const quoted = message.reply_to_message;
		if (quoted && quoted.from?.id !== me.id) {
			const who =
				[quoted.from?.first_name, quoted.from?.last_name]
					.filter(Boolean)
					.join(" ") || "quelqu'un";
			const text = messageText(quoted);
			blocks.push({
				type: "text",
				text: `[En réponse au message de ${who}]${text ? `\n${text}` : ""}`,
			});
			blocks.push(...(await attachments(quoted)));
		}
		const origin = forwardedFrom(message);
		const text = messageText(message);
		const label = origin ? `[Message transféré de ${origin}]` : `${sender} :`;
		blocks.push({ type: "text", text: text ? `${label}\n${text}` : label });
		blocks.push(...(await attachments(message)));
		return blocks;
	}

	async function handle(messages: Message[]): Promise<void> {
		const first = messages[0];
		if (!first?.from) return;
		const chatId = first.chat.id;
		const userId = first.from.id;
		const name = config.allowedUsers.get(userId) ?? String(userId);
		const replyTo = isGroup(first)
			? { reply_parameters: { message_id: first.message_id } }
			: {};
		const send = async (text: string) => {
			for (const part of splitForTelegram(text)) {
				try {
					await bot.api.sendMessage(chatId, markdownToTelegramHtml(part), {
						...replyTo,
						parse_mode: "HTML",
						link_preview_options: { is_disabled: true },
					});
				} catch (error) {
					if (!(error instanceof GrammyError) || error.error_code !== 400)
						throw error;
					await bot.api.sendMessage(chatId, stripMarkdown(part), replyTo);
				}
			}
		};

		if (!cap.take(userId)) {
			await send(
				`Limite du jour atteinte (${config.dailyMessageCap} messages). Ça repart demain.`,
			);
			return;
		}

		const typing = setInterval(
			() => bot.api.sendChatAction(chatId, "typing").catch(() => {}),
			4500,
		);
		bot.api.sendChatAction(chatId, "typing").catch(() => {});
		const started = Date.now();
		try {
			const content: Block[] = [{ type: "text", text: `[${frenchNow()}]` }];
			for (const message of messages)
				content.push(...(await describe(message, first.from.first_name)));

			const ctx: ToolContext = {
				db: makeDb(config.supabaseUrl, config.supabaseKey, `telegram:${name}`),
				catalogue,
				appUrl: config.appUrl,
				songIndex,
			};
			const result = await runTurn({
				complete: (request) => complete(mistral, request),
				model: config.model,
				tools: [
					...songTools(ctx),
					...catalogueTools(ctx),
					...ordinaireTools(ctx),
					...setlistTools(ctx),
					...webTools(mistral),
				],
				history: history.get(chatId),
				content,
				cacheKey: `chat-${chatId}`,
			});
			history.set(chatId, result.messages);
			await send(result.text);
			console.log(
				JSON.stringify({
					event: "turn",
					user: name,
					chatId,
					ms: Date.now() - started,
					finish: result.finishReason,
					asked: describeAsk(content),
					calls: result.calls,
					reply: result.text.slice(0, 600),
					usage: result.usage,
				}),
			);
		} catch (error) {
			console.error(
				JSON.stringify({
					event: "turn_failed",
					user: name,
					chatId,
					error: String(error),
				}),
			);
			const reason = "Quelque chose a échoué de mon côté";
			await send(
				`${reason}. Réessaie dans quelques minutes. Si je venais de modifier un chant ou une setlist, vérifie dans le Parolier.`,
			);
		} finally {
			clearInterval(typing);
		}
	}

	bot.on("message", async (gctx: Context) => {
		const message = gctx.message;
		if (!message?.from) return;
		const cmd = command(message, me);

		if (cmd === "whoami") {
			await gctx.reply(
				`Ton identifiant Telegram : ${message.from.id}\nEnvoie-le à Pierre pour avoir accès.`,
			);
			return;
		}
		if (!config.allowedUsers.has(message.from.id)) return;
		if (cmd === "new") {
			history.clear(message.chat.id);
			await gctx.reply("Nouvelle conversation.");
			return;
		}
		if (cmd === "start") {
			await gctx.reply(
				"Salut ! Envoie-moi un titre, des paroles, des photos de partition ou un lien : « ajoute … », « fais la setlist à partir de ce message », « y a une erreur dans … », « annule ».",
			);
			return;
		}
		if (cmd) return;

		const group = message.media_group_id;
		const pending = group ? albums.get(group) : undefined;
		if (pending) {
			pending.messages.push(message);
			return;
		}
		if (!isAddressed(message, me)) return;

		if (group) {
			const entry = {
				messages: [message],
				timer: setTimeout(() => {
					albums.delete(group);
					enqueue(message.chat.id, () => handle(entry.messages));
				}, ALBUM_WAIT_MS),
			};
			albums.set(group, entry);
			return;
		}
		enqueue(message.chat.id, () => handle([message]));
	});

	bot.catch((err) =>
		console.error(
			JSON.stringify({ event: "telegram_error", error: String(err.error) }),
		),
	);

	const songs = catalogue.size;
	bot
		.init()
		.then(() => {
			me = { id: bot.botInfo.id, username: bot.botInfo.username };
			console.log(
				JSON.stringify({
					event: "started",
					bot: me.username,
					catalogue: songs,
					users: config.allowedUsers.size,
				}),
			);
			return bot.start({
				allowed_updates: ["message"],
				drop_pending_updates: false,
			});
		})
		.catch((error) => {
			console.error(
				JSON.stringify({ event: "startup_failed", error: String(error) }),
			);
			process.exit(1);
		});
	return bot;
}

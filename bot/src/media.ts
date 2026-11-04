import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export const IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PAGE_BYTES = 3 * 1024 * 1024;

export function isImageType(type: string | undefined): type is ImageType {
	return IMAGE_TYPES.includes(type as ImageType);
}

export function dataUrl(data: Buffer, mediaType: string): string {
	return `data:${mediaType};base64,${data.toString("base64")}`;
}

export function sniffImageType(data: Buffer): ImageType | undefined {
	if (data[0] === 0xff && data[1] === 0xd8) return "image/jpeg";
	if (
		data
			.subarray(0, 8)
			.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
	)
		return "image/png";
	if (data.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
	if (
		data.subarray(0, 4).toString("ascii") === "RIFF" &&
		data.subarray(8, 12).toString("ascii") === "WEBP"
	)
		return "image/webp";
	return undefined;
}

const PRIVATE_V4: Array<[string, number]> = [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
];

function v4ToInt(ip: string): number {
	return (
		ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0
	);
}

export function isPrivateAddress(ip: string): boolean {
	if (net.isIPv4(ip)) {
		const n = v4ToInt(ip);
		return PRIVATE_V4.some(([base, bits]) => {
			const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
			return (n & mask) === (v4ToInt(base) & mask);
		});
	}
	if (net.isIPv6(ip)) {
		const lower = ip.toLowerCase();
		const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (mapped?.[1]) return isPrivateAddress(mapped[1]);
		return (
			lower === "::" ||
			lower === "::1" ||
			lower.startsWith("fc") ||
			lower.startsWith("fd") ||
			/^fe[89ab]/.test(lower) ||
			lower.startsWith("ff")
		);
	}
	return true;
}

/** Checked at connection time, so a hostname can't resolve to a public address first and a LAN one after. */
const publicOnlyLookup: net.LookupFunction = (hostname, options, callback) => {
	dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
		if (err) return callback(err, "", 0);
		const list = addresses as dns.LookupAddress[];
		const blocked = list.find((a) => isPrivateAddress(a.address));
		if (blocked || list.length === 0) {
			return callback(
				new Error(`Refused: ${hostname} points to a private address`),
				"",
				0,
			);
		}
		if (options.all)
			return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(
				null,
				list,
			);
		const first = list[0] as dns.LookupAddress;
		callback(null, first.address, first.family);
	});
};

function getOnce(
	url: URL,
	maxBytes: number,
): Promise<{
	status: number;
	location?: string;
	type?: string;
	body?: Buffer;
}> {
	return new Promise((resolve, reject) => {
		const get = url.protocol === "http:" ? http.get : https.get;
		const req = get(
			url,
			{
				lookup: publicOnlyLookup,
				timeout: 15_000,
				headers: { "user-agent": "parolier-bot" },
			},
			(res) => {
				const status = res.statusCode ?? 0;
				if (status >= 300 && status < 400) {
					res.resume();
					return resolve({ status, location: res.headers.location });
				}
				const chunks: Buffer[] = [];
				let size = 0;
				res.on("data", (chunk: Buffer) => {
					size += chunk.length;
					if (size > maxBytes) {
						req.destroy(
							new Error(
								`File larger than ${Math.round(maxBytes / 1024 / 1024)} MB`,
							),
						);
						return;
					}
					chunks.push(chunk);
				});
				res.on("end", () =>
					resolve({
						status,
						type: res.headers["content-type"],
						body: Buffer.concat(chunks),
					}),
				);
				res.on("error", reject);
			},
		);
		req.on("timeout", () => req.destroy(new Error("Timed out")));
		req.on("error", reject);
	});
}

export interface Fetched {
	data: Buffer;
	contentType: string;
	url: string;
}

/** GET a public http(s) URL, following redirects, refusing anything that resolves to a private address. */
export async function fetchPublic(
	rawUrl: string,
	maxBytes: number,
): Promise<Fetched> {
	let url = new URL(rawUrl);
	for (let hop = 0; hop < 4; hop++) {
		if (url.protocol !== "https:" && url.protocol !== "http:") {
			throw new Error("Only http and https links can be opened");
		}
		const host = url.hostname.replace(/^\[|\]$/g, "");
		if (net.isIP(host) && isPrivateAddress(host)) {
			throw new Error("Refused: private address");
		}
		const res = await getOnce(url, maxBytes);
		if (res.location) {
			url = new URL(res.location, url);
			continue;
		}
		if (res.status !== 200 || !res.body) {
			throw new Error(`The link answered HTTP ${res.status}`);
		}
		return {
			data: res.body,
			contentType: (res.type ?? "").split(";")[0]?.trim().toLowerCase() ?? "",
			url: url.href,
		};
	}
	throw new Error("Too many redirects");
}

export function htmlToText(html: string): string {
	return html
		.replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div|li|h[1-6]|tr|pre|section|article)>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/[ \t]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{2,}/g, "\n")
		.trim();
}

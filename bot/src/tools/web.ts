import { z } from "zod";
import {
	MAX_IMAGE_BYTES,
	MAX_PAGE_BYTES,
	MAX_PDF_BYTES,
	fetchPublic,
	htmlToText,
	sniffImageType,
} from "../media";
import { type Mistral, pdfToText, webSearch } from "../mistral";
import { defineTool } from "./tool";

const MAX_PAGE_CHARS = 30_000;

export function webTools(client: Mistral) {
	return [
		defineTool({
			name: "web_search",
			description:
				"Search the web for a song's lyrics, chords or score. Returns a short summary and the source pages; open the useful ones with fetch_page. Only use it when the Parolier and the catalogue don't have the song.",
			schema: z.object({ query: z.string().min(2) }),
			run: async ({ query }) => JSON.stringify(await webSearch(client, query)),
		}),

		defineTool({
			name: "fetch_page",
			description:
				"Open a link: a web page (returns its text), a PDF (returns its text, read by OCR) or an image (returned so you can look at it). Pages that draw their score with JavaScript come back empty.",
			schema: z.object({ url: z.url() }),
			run: async ({ url }) => {
				const page = await fetchPublic(
					url,
					Math.max(MAX_PDF_BYTES, MAX_IMAGE_BYTES, MAX_PAGE_BYTES),
				);
				const image = sniffImageType(page.data);
				if (image) {
					if (page.data.length > MAX_IMAGE_BYTES)
						throw new Error("Image larger than 5 MB");
					return {
						text: `Image from ${page.url}`,
						images: [{ data: page.data, type: image }],
					};
				}
				if (
					page.contentType === "application/pdf" ||
					page.data.subarray(0, 5).toString("ascii") === "%PDF-"
				) {
					const text = await pdfToText(client, page.data);
					return JSON.stringify({
						url: page.url,
						kind: "pdf",
						text: text.slice(0, MAX_PAGE_CHARS),
					});
				}
				if (page.data.length > MAX_PAGE_BYTES)
					throw new Error("Page larger than 3 MB");
				const text = htmlToText(page.data.toString("utf8"));
				return JSON.stringify({
					url: page.url,
					kind: "page",
					text: text
						? text.slice(0, MAX_PAGE_CHARS)
						: "(empty page: its content is probably drawn by a script)",
					truncated: text.length > MAX_PAGE_CHARS,
				});
			},
		}),
	];
}

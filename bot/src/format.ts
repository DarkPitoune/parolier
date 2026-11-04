const escapeHtml = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(line: string): string {
	const codes: string[] = [];
	let out = line.replace(/`([^`\n]+)`/g, (_, code: string) => {
		codes.push(`<code>${escapeHtml(code)}</code>`);
		return `\u0000${codes.length - 1}\u0000`;
	});
	out = escapeHtml(out)
		.replace(
			/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g,
			(_, text: string, url: string) =>
				`<a href="${url.replace(/"/g, "&quot;")}">${text}</a>`,
		)
		.replace(/\*\*(?=\S)([^*\n]+?)\*\*/g, "<b>$1</b>")
		.replace(/__(?=\S)([^_\n]+?)__/g, "<b>$1</b>")
		.replace(/(^|[^*\w])\*(?=\S)([^*\n]+?)\*(?!\w)/g, "$1<i>$2</i>")
		.replace(/(^|[^_\w])_(?=\S)([^_\n]+?)_(?!\w)/g, "$1<i>$2</i>")
		.replace(/~~(?=\S)([^~\n]+?)~~/g, "<s>$1</s>");
	return out.replace(
		/\u0000(\d+)\u0000/g,
		(_, i: string) => codes[Number(i)] ?? "",
	);
}

/**
 * Telegram's HTML subset from the Markdown models write anyway: bold, italic,
 * strikethrough, inline and fenced code, links, headings as bold lines, and
 * bullets. Everything else is escaped, so the result always parses.
 */
export function markdownToTelegramHtml(markdown: string): string {
	const out: string[] = [];
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (/^\s*```/.test(line)) {
			const body: string[] = [];
			while (++i < lines.length && !/^\s*```/.test(lines[i] ?? ""))
				body.push(lines[i] ?? "");
			out.push(`<pre>${escapeHtml(body.join("\n"))}</pre>`);
			continue;
		}
		const heading = line.match(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/);
		if (heading) {
			out.push(`<b>${inline(heading[1] ?? "")}</b>`);
			continue;
		}
		if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
			out.push("");
			continue;
		}
		const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
		if (bullet) {
			out.push(`${bullet[1] ?? ""}• ${inline(bullet[2] ?? "")}`);
			continue;
		}
		const quote = line.match(/^\s*>\s?(.*)$/);
		if (quote) {
			out.push(`<blockquote>${inline(quote[1] ?? "")}</blockquote>`);
			continue;
		}
		out.push(inline(line));
	}
	return out.join("\n").replace(/<\/blockquote>\n<blockquote>/g, "\n");
}

/** What the reader would see if the HTML were refused: the same text without markup. */
export function stripMarkdown(markdown: string): string {
	return markdown
		.replace(/^\s*```.*$/gm, "")
		.replace(/^\s{0,3}#{1,6}\s+/gm, "")
		.replace(/^(\s*)[-*+]\s+/gm, "$1• ")
		.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
		.replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g, "$1$2")
		.replace(/`([^`\n]+)`/g, "$1");
}

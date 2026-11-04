import { describe, expect, it } from "vitest";
import { markdownToTelegramHtml, stripMarkdown } from "./format";

describe("markdownToTelegramHtml", () => {
	it("converts the usual inline marks", () => {
		expect(
			markdownToTelegramHtml("**Ajouté** : *Sa parole est lumière*, `#414`"),
		).toBe("<b>Ajouté</b> : <i>Sa parole est lumière</i>, <code>#414</code>");
	});

	it("turns headings into bold lines and bullets into dots", () => {
		expect(
			markdownToTelegramHtml("### Setlist\n- Lumière au matin\n* Silence"),
		).toBe("<b>Setlist</b>\n• Lumière au matin\n• Silence");
	});

	it("keeps links and bare URLs usable", () => {
		expect(
			markdownToTelegramHtml(
				"[Ouvrir](https://parolier.jubilate.fr/songs/414)\nhttps://parolier.jubilate.fr/setlists/58",
			),
		).toBe(
			'<a href="https://parolier.jubilate.fr/songs/414">Ouvrir</a>\nhttps://parolier.jubilate.fr/setlists/58',
		);
	});

	it("escapes HTML and leaves lone symbols alone", () => {
		expect(
			markdownToTelegramHtml("Do <-> Ré & 2 * 3 = 6, mon_fichier_pdf"),
		).toBe("Do &lt;-&gt; Ré &amp; 2 * 3 = 6, mon_fichier_pdf");
	});

	it("does not format inside code", () => {
		expect(markdownToTelegramHtml("```\n**Am** E <b>\n```")).toBe(
			"<pre>**Am** E &lt;b&gt;</pre>",
		);
		expect(markdownToTelegramHtml("`**x**`")).toBe("<code>**x**</code>");
	});

	it("merges consecutive quote lines and drops horizontal rules", () => {
		expect(
			markdownToTelegramHtml(
				"> Nuit de lumière\n> nuit de la promesse\n---\nfin",
			),
		).toBe(
			"<blockquote>Nuit de lumière\nnuit de la promesse</blockquote>\n\nfin",
		);
	});
});

describe("stripMarkdown", () => {
	it("leaves readable plain text", () => {
		expect(
			stripMarkdown("## Fait\n- **Lumière** [lien](https://a.example/x)"),
		).toBe("Fait\n• Lumière lien (https://a.example/x)");
	});
});

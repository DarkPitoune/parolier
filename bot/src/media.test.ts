import { describe, expect, it } from "vitest";
import {
	fetchPublic,
	htmlToText,
	isPrivateAddress,
	sniffImageType,
} from "./media";

describe("isPrivateAddress", () => {
	it.each([
		"192.168.1.20",
		"10.0.0.1",
		"127.0.0.1",
		"172.20.3.4",
		"169.254.1.1",
		"0.0.0.0",
		"::1",
		"fd00::1",
		"fe80::1",
		"::ffff:192.168.1.1",
	])("refuses %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));
	it.each(["76.76.21.93", "8.8.8.8", "172.32.0.1", "2606:4700::1111"])(
		"allows %s",
		(ip) => expect(isPrivateAddress(ip)).toBe(false),
	);
});

describe("fetchPublic", () => {
	it("refuses other schemes and literal private addresses", async () => {
		await expect(fetchPublic("ftp://example.com/a.png", 100)).rejects.toThrow(
			/http/,
		);
		await expect(
			fetchPublic("https://192.168.1.20/a.png", 100),
		).rejects.toThrow(/private/);
	});

	it("refuses a hostname that resolves to a loopback address", async () => {
		await expect(fetchPublic("http://localhost/a.png", 100)).rejects.toThrow(
			/private/,
		);
	});
});

describe("sniffImageType", () => {
	it("recognises images by their bytes, not their name", () => {
		expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
			"image/jpeg",
		);
		expect(
			sniffImageType(
				Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]),
			),
		).toBe("image/png");
		expect(sniffImageType(Buffer.from("%PDF-1.7"))).toBeUndefined();
	});
});

describe("htmlToText", () => {
	it("keeps the visible text and line breaks of a lyrics page", () => {
		const html =
			"<html><head><title>x</title><style>p{}</style></head><body><script>var a=1</script><h1>Nuit de lumière</h1><p>Refrain&nbsp;:<br>Nuit de lumière, nuit l&#39;espérance</p></body></html>";
		expect(htmlToText(html)).toBe(
			"Nuit de lumière\nRefrain :\nNuit de lumière, nuit l'espérance",
		);
	});
});

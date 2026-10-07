import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IncipitPanel } from "./IncipitPanel";

const synthInit = vi.fn();

vi.mock("abcjs", () => ({
	renderAbc: vi.fn(() => [{}]),
	synth: {
		CreateSynth: class {
			init = synthInit;
			prime = vi.fn(async () => ({}));
			start = vi.fn();
			stop = vi.fn();
		},
	},
}));

const kyrie = [
	{ label: "Prière pénitentielle", abc: "X:1\nK:A\nF4 C F G2 |" },
	{ label: "Kyrie", image_path: "/sheet-music/incipits/211-abc.png" },
];

const openPanel = () =>
	userEvent.click(screen.getByRole("button", { name: /début de la mélodie/i }));

describe("IncipitPanel", () => {
	it("starts collapsed", () => {
		render(<IncipitPanel incipits={kyrie} />);
		expect(
			screen.getByRole("button", { name: /début de la mélodie/i }),
		).toBeInTheDocument();
		expect(screen.queryByText("Prière pénitentielle")).not.toBeInTheDocument();
	});

	it("shows every incipit once opened, with the crop when there is no transcription", async () => {
		render(<IncipitPanel incipits={kyrie} />);
		await openPanel();

		expect(screen.getByText("Prière pénitentielle")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Écouter Prière pénitentielle" }),
		).toBeInTheDocument();
		expect(screen.getByRole("img", { name: /Kyrie/ })).toHaveAttribute(
			"src",
			expect.stringContaining(
				"/storage/v1/object/public/sheet-music/incipits/211-abc.png",
			),
		);
	});

	it("goes back to play once the melody has finished", async () => {
		render(<IncipitPanel incipits={kyrie} />);
		await openPanel();
		const play = screen.getByRole("button", {
			name: "Écouter Prière pénitentielle",
		});
		await waitFor(async () => {
			await userEvent.click(play);
			expect(synthInit).toHaveBeenCalled();
		});
		expect(
			screen.getByRole("button", { name: "Arrêter Prière pénitentielle" }),
		).toBeInTheDocument();

		const { onEnded } = synthInit.mock.calls[0][0].options;
		act(() => onEnded());

		expect(
			screen.getByRole("button", { name: "Écouter Prière pénitentielle" }),
		).toBeInTheDocument();
	});
});

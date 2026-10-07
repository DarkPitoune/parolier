import type { Incipit } from "@/assets/types";
import { supabaseUrl } from "@/utils/supabase";
import {
	Disclosure,
	DisclosureButton,
	DisclosurePanel,
} from "@headlessui/react";
import {
	ChevronDownIcon,
	MusicalNoteIcon,
	PlayIcon,
	StopIcon,
} from "@heroicons/react/20/solid";
import type { MidiBuffer, TuneObject } from "abcjs";
import { useEffect, useRef, useState } from "react";

// Wide enough that no incipit is ever compressed; the SVG is trimmed to its
// content afterwards, so this never shows as empty space.
const LAYOUT_WIDTH = 2000;

function AbcIncipit({ abc, label }: { abc: string; label: string }) {
	const staffRef = useRef<HTMLDivElement>(null);
	const tuneRef = useRef<TuneObject | null>(null);
	const synthRef = useRef<MidiBuffer | null>(null);
	const [playing, setPlaying] = useState(false);

	// One line at a fixed note size, never stretched to the container: a
	// phone scrolls it sideways instead of shrinking it.
	useEffect(() => {
		let cancelled = false;
		import("abcjs").then((abcjs) => {
			const element = staffRef.current;
			if (cancelled || !element) return;
			[tuneRef.current] = abcjs.renderAbc(element, abc, {
				staffwidth: LAYOUT_WIDTH,
				format: { stretchlast: 0 },
				foregroundColor: "currentColor",
				paddingleft: 0,
				paddingright: 0,
				paddingtop: 0,
			});
			const svg = element.querySelector("svg");
			if (!svg) return;
			const box = svg.getBBox();
			const width = Math.ceil(box.x + box.width + 2);
			const height = Number(svg.getAttribute("height"));
			svg.setAttribute("width", String(width));
			svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
			element.style.width = `${width}px`;
		});
		return () => {
			cancelled = true;
		};
	}, [abc]);

	useEffect(
		() => () => {
			synthRef.current?.stop();
		},
		[],
	);

	const togglePlay = async () => {
		if (playing) {
			synthRef.current?.stop();
			setPlaying(false);
			return;
		}
		if (!tuneRef.current) return;
		const abcjs = await import("abcjs");
		const synth = new abcjs.synth.CreateSynth();
		synthRef.current = synth;
		setPlaying(true);
		await synth.init({
			visualObj: tuneRef.current,
			// abcjs only reads callbacks from `options`; its typings also accept a
			// top-level onEnded, which it silently ignores.
			options: {
				onEnded: () => {
					// A stopped synth still fires onended, possibly after a new one started.
					if (synthRef.current === synth) setPlaying(false);
				},
			},
		});
		await synth.prime();
		synth.start();
	};

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between gap-2">
				<span className="text-sm font-semibold text-jubilateBlue-500 dark:text-jubilateBlue-400">
					{label}
				</span>
				<button
					type="button"
					onClick={togglePlay}
					className="flex items-center gap-1 rounded-full bg-jubilateBlue-500 dark:bg-jubilateBlue-400 px-3 py-1 text-sm text-white"
					aria-label={playing ? `Arrêter ${label}` : `Écouter ${label}`}
				>
					{playing ? (
						<StopIcon className="size-4" />
					) : (
						<PlayIcon className="size-4" />
					)}
					{playing ? "Stop" : "Écouter"}
				</button>
			</div>
			<div className="overflow-x-auto">
				<div ref={staffRef} className="text-black dark:text-white" />
			</div>
		</div>
	);
}

function ImageIncipit({
	imagePath,
	label,
}: { imagePath: string; label: string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-sm font-semibold text-jubilateBlue-500 dark:text-jubilateBlue-400">
				{label}
			</span>
			{/* A fixed height keeps the staff at reading size; a narrow screen scrolls sideways
			    rather than shrinking it. Scans are black on white, so dark mode inverts them. */}
			<div className="overflow-x-auto">
				<img
					src={`${supabaseUrl}/storage/v1/object/public${imagePath}`}
					alt={`Début de la partition : ${label}`}
					className="h-24 w-auto max-w-none rounded dark:invert"
				/>
			</div>
		</div>
	);
}

function IncipitPanel({ incipits }: { incipits: Incipit[] }) {
	return (
		<Disclosure
			as="div"
			className="rounded-md border border-jubilateBlue-100 dark:border-slate-600"
		>
			<DisclosureButton className="group flex w-full items-center gap-2 px-3 py-2 text-sm text-jubilateBlue-500 dark:text-jubilateBlue-400">
				<MusicalNoteIcon className="size-4" />
				<span>Début de la mélodie</span>
				<ChevronDownIcon className="ml-auto size-5 transition-transform group-data-[open]:rotate-180" />
			</DisclosureButton>
			<DisclosurePanel className="flex flex-col gap-4 px-3 pb-3">
				{incipits.map((incipit) =>
					incipit.abc ? (
						<AbcIncipit
							key={incipit.label}
							abc={incipit.abc}
							label={incipit.label}
						/>
					) : incipit.image_path ? (
						<ImageIncipit
							key={incipit.label}
							imagePath={incipit.image_path}
							label={incipit.label}
						/>
					) : null,
				)}
			</DisclosurePanel>
		</Disclosure>
	);
}

export { IncipitPanel };

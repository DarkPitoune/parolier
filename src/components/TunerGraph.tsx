import { isDarkAtom } from "@/components/Contexts/SettingsContext";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

// Cents shown above/below the centre line.
const RANGE = 50;
// ± this many cents counts as "in tune" (the shaded green band).
const IN_TUNE = 5;

// Jubilate palette (see src/index.css @theme).
const BLUE_LIGHT = "#4030ec";
const BLUE_DARK = "#7a9df6";

/**
 * A strip-chart of the detected pitch deviation over time. New samples enter on
 * the right and scroll left, so you can see the note drift and settle. Draws on
 * a canvas via its own rAF loop (reading the latest cents from a ref) so it
 * stays smooth independent of React re-renders.
 */
export function TunerGraph({ cents }: { cents: number | null }) {
	const isDark = useAtomValue(isDarkAtom);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const centsRef = useRef<number | null>(cents);
	const isDarkRef = useRef(isDark);
	const historyRef = useRef<(number | null)[]>([]);

	// Keep the rAF loop reading current values without re-subscribing.
	centsRef.current = cents;
	isDarkRef.current = isDark;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const context = canvas.getContext("2d");
		if (!context) return;

		let raf = 0;
		const draw = () => {
			const dpr = window.devicePixelRatio || 1;
			const cssW = canvas.clientWidth;
			const cssH = canvas.clientHeight;
			if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
				canvas.width = cssW * dpr;
				canvas.height = cssH * dpr;
			}
			const w = canvas.width;
			const h = canvas.height;
			const dark = isDarkRef.current;

			const maxSamples = Math.max(2, Math.floor(cssW));
			const hist = historyRef.current;
			hist.push(centsRef.current);
			while (hist.length > maxSamples) hist.shift();

			const yFor = (c: number) =>
				h / 2 - (Math.max(-RANGE, Math.min(RANGE, c)) / RANGE) * (h / 2);

			context.clearRect(0, 0, w, h);

			// In-tune band.
			context.fillStyle = "rgba(0, 188, 72, 0.15)";
			context.fillRect(0, yFor(IN_TUNE), w, yFor(-IN_TUNE) - yFor(IN_TUNE));

			// Centre line.
			context.strokeStyle = dark
				? "rgba(255, 255, 255, 0.25)"
				: "rgba(0, 0, 0, 0.2)";
			context.lineWidth = dpr;
			context.beginPath();
			context.moveTo(0, h / 2);
			context.lineTo(w, h / 2);
			context.stroke();

			// Pitch trace.
			context.strokeStyle = dark ? BLUE_DARK : BLUE_LIGHT;
			context.lineWidth = 2 * dpr;
			context.lineJoin = "round";
			context.lineCap = "round";
			context.beginPath();
			let started = false;
			for (let i = 0; i < hist.length; i++) {
				const c = hist[i];
				if (c === null) {
					started = false;
					continue;
				}
				const x = (i / (maxSamples - 1)) * w;
				const y = yFor(c);
				if (started) context.lineTo(x, y);
				else {
					context.moveTo(x, y);
					started = true;
				}
			}
			context.stroke();

			raf = requestAnimationFrame(draw);
		};
		raf = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(raf);
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className="h-40 w-full rounded-lg bg-jubilateBlue-100 dark:bg-gray-700"
		/>
	);
}

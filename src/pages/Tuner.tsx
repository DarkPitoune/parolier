import { PageHeader } from "@/components";
import { TunerGraph } from "@/components/TunerGraph";
import { useTuner } from "@/hooks/useTuner";
import { useWakeLock } from "@/hooks/useWakeLock";
import clsx from "clsx";
import { useEffect } from "react";

// Cents at or below this are considered "in tune".
const IN_TUNE_CENTS = 5;
// Needle travel is clamped to this cents range on each side of centre.
const NEEDLE_RANGE = 50;

function Tuner() {
	useWakeLock();
	const { reading, error, retry } = useTuner();

	useEffect(() => {
		document.title = "Accordeur - Parolier";
	}, []);

	const cents = reading?.cents ?? 0;
	const inTune = reading !== null && Math.abs(cents) <= IN_TUNE_CENTS;
	const needlePercent =
		(Math.max(-NEEDLE_RANGE, Math.min(NEEDLE_RANGE, cents)) / NEEDLE_RANGE) *
		50;

	const accentColor = inTune
		? "text-jubilateGreen"
		: reading !== null
			? "text-jubilateYellow"
			: "text-gray-400 dark:text-gray-500";

	return (
		<div className="bg-white dark:bg-gray-800 min-h-screen">
			<PageHeader variant="detail" title="Accordeur" />

			<div className="flex flex-col items-center gap-10 px-6 py-12">
				{error ? (
					<div className="flex flex-col items-center gap-4 pt-8">
						<p className="text-center text-jubilateRed">{error}</p>
						<button
							type="button"
							onClick={retry}
							className="rounded-full bg-jubilateBlue-500 px-8 py-2 font-flame text-lg text-white transition hover:bg-jubilateBlue-700"
						>
							Réessayer
						</button>
					</div>
				) : (
					<>
						{/* Note name + octave */}
						<div className="flex flex-col items-center">
							<div
								className={clsx(
									"font-flame leading-none transition-colors",
									accentColor,
								)}
							>
								<span className="text-8xl md:text-9xl">
									{reading ? reading.name : "–"}
								</span>
								{reading && (
									<span className="text-4xl md:text-5xl align-top">
										{reading.octave}
									</span>
								)}
							</div>
							<p className="mt-2 h-6 text-gray-500 dark:text-gray-400">
								{reading ? null : "écoute…"}
							</p>
						</div>

						{/* Cents needle */}
						<div className="w-full max-w-md">
							<div className="relative h-16 rounded-lg bg-jubilateBlue-100 dark:bg-gray-700">
								{/* centre marker */}
								<div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-jubilateBlue-300 dark:bg-gray-500" />
								{/* needle */}
								<div
									className={clsx(
										"absolute top-1 bottom-1 w-1 rounded-full transition-all duration-100 ease-out",
										inTune
											? "bg-jubilateGreen"
											: reading !== null
												? "bg-jubilateYellow"
												: "bg-gray-400 dark:bg-gray-500",
									)}
									style={{
										left: `calc(50% + ${needlePercent}% - 2px)`,
									}}
								/>
							</div>
							<div className="mt-2 flex justify-between text-xs text-gray-400 dark:text-gray-500">
								<span>♭ -50</span>
								<span>0</span>
								<span>+50 ♯</span>
							</div>
						</div>

						{/* Numeric readout */}
						<div className="flex h-12 flex-col items-center gap-1">
							{reading && (
								<>
									<p
										className={clsx(
											"font-flame text-2xl transition-colors",
											accentColor,
										)}
									>
										{cents > 0 ? "+" : ""}
										{cents} cents
									</p>
									<p className="text-sm text-gray-500 dark:text-gray-400">
										{reading.frequency.toFixed(1)} Hz
									</p>
								</>
							)}
						</div>

						{/* Scrolling pitch-over-time graph */}
						<div className="w-full max-w-md">
							<TunerGraph cents={reading?.cents ?? null} />
						</div>

						<p className="max-w-md text-center text-sm text-gray-400 dark:text-gray-500">
							Référence A = 440 Hz. Jouez ou chantez une note près du micro.
						</p>
					</>
				)}
			</div>
		</div>
	);
}

export { Tuner };

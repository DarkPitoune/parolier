import type { Strophe } from "@/assets/types";
import { useCallback, useEffect, useState } from "react";

const SlideViewer = ({ strophes }: { strophes: Strophe[] }) => {
	const [step, setStep] = useState(0);

	const plus1 = useCallback(
		() => setStep((s) => Math.min(s + 1, strophes.length - 1)),
		[strophes],
	);
	const minus1 = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "f" || e.key === "F")
				return document.body.requestFullscreen();
			if (e.key === "ArrowRight") plus1();
			if (e.key === "ArrowLeft") minus1();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [minus1, plus1]);

	return (
		<div
			data-type={strophes[step].type}
			className="text-6xl text-center data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold"
		>
			{strophes[step].content.map((line, lineIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
				<div className="col-span-2" key={lineIndex}>
					{line.text}
				</div>
			))}
			<div className="absolute inset-0 flex items-stretch justify-stretch">
				<div className="grow" onTouchStart={minus1} />
				<div className="grow" onTouchStart={plus1} />
			</div>
		</div>
	);
};

export { SlideViewer };

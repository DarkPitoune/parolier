import { useLayoutEffect, useRef } from "react";
import { withNonBreakingSpaces } from "../DynamicText";

const MAX_FONT_CQH = 8;
const MIN_FONT_CQH = 2;

/** A free-length text, shrunk until it fits the slide. */
const TextSlide = ({ text }: { text: string }) => {
	const boxRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: the effect measures the rendered text, so a new text has to re-run the fit
	useLayoutEffect(() => {
		const box = boxRef.current;
		const content = contentRef.current;
		if (!box || !content) return;

		const fits = (size: number) => {
			content.style.fontSize = `${size}cqh`;
			return (
				content.scrollHeight <= box.clientHeight &&
				content.scrollWidth <= content.clientWidth
			);
		};

		const fit = () => {
			if (fits(MAX_FONT_CQH)) return;
			let lo = MIN_FONT_CQH;
			let hi = MAX_FONT_CQH;
			while (hi - lo > 0.1) {
				const mid = (lo + hi) / 2;
				if (fits(mid)) lo = mid;
				else hi = mid;
			}
			content.style.fontSize = `${lo}cqh`;
		};

		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(box);
		return () => observer.disconnect();
	}, [text]);

	return (
		<div className="relative h-full w-full" style={{ containerType: "size" }}>
			<div
				ref={boxRef}
				className="absolute inset-[5%] flex items-center justify-center overflow-hidden"
			>
				<div
					ref={contentRef}
					className="w-full whitespace-pre-wrap text-center leading-snug"
				>
					{withNonBreakingSpaces(text)}
				</div>
			</div>
		</div>
	);
};

export { TextSlide };

import type { Strophe } from "@/assets/types";

const SlideViewer = ({ strophe }: { strophe: Strophe }) => {
	return (
		<div
			data-type={strophe.type}
			className="text-6xl text-center data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold"
		>
			{strophe.content.map((line, lineIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
				<div className="col-span-2" key={lineIndex}>
					{line.text}
				</div>
				))}
		</div>
	);
};

export { SlideViewer };

import type { Strophe } from "@/assets/types";

const SlideViewer = ({ strophe }: { strophe: Strophe }) => {
	return (
		<div className="h-full w-full" style={{ containerType: "size" }}>
			<div
				data-type={strophe.type}
				className="text-[8cqh] h-full w-full flex flex-col items-center justify-center text-center data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold"
			>
				{Array.isArray(strophe.content) ? (
					strophe.content.map((line, lineIndex) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
						<div className="col-span-2" key={lineIndex}>
							{line.text}
						</div>
					))
				) : (
					<div className="col-span-2">{strophe.content}</div>
				)}
			</div>
		</div>
	);
};

export { SlideViewer };

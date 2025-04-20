import type { Tags } from "@/utils/supabase";
import clsx from "clsx";

type TagChipProps = {
	iconOnly?: boolean;
	inverted?: boolean;
	outline?: boolean;
	tag: Tags[number];
} & React.HTMLProps<HTMLDivElement>;

export const TagChip = ({
	iconOnly = false,
	inverted = false,
	outline = false,
	tag,
	...props
}: TagChipProps) => {
	return (
		<div
			key={tag.id}
			className={clsx(
				"rounded-full font-semibold inline-flex items-center gap-2 m-1 select-none ",
				outline ? "border-2" : "border-0",
				iconOnly ? "p-2" : "px-3 py-0.5",
				inverted
					? "text-white bg-[var(--tag-color)] border-[var(--tag-color)]"
					: "text-[var(--tag-color)] bg-transparent border-[var(--tag-color)] border-2",
			)}
			style={{ "--tag-color": tag.color } as React.CSSProperties}
			{...(props.onClick && { role: "button" })}
			{...props}
		>
			<div
				className="w-4 h-4 flex items-center justify-center"
				style={{
					fill: inverted ? "white" : tag.color || "black",
				}}
				// biome-ignore lint/security/noDangerouslySetInnerHtml: svg is in database
				dangerouslySetInnerHTML={{ __html: tag.svg || "" }}
			/>
			{!iconOnly && <div className="font-bold">{tag.name}</div>}
		</div>
	);
};

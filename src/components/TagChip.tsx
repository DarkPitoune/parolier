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
	className,
	...props
}: TagChipProps) => {
	return (
		<div
			className={clsx(
				"rounded-full font-semibold inline-flex items-center gap-2 m-1 select-none",
				outline ? "border" : inverted ? "border-0" : "border-2",
				iconOnly ? "p-2" : "px-3 py-0.5",
				inverted
					? "text-white bg-(--tag-color) border-(--tag-color)"
					: "text-(--tag-color) bg-transparent border-(--tag-color)",
				className,
			)}
			style={{ "--tag-color": tag.color } as React.CSSProperties}
			{...(props.onClick && { role: "button" })}
			{...props}
		>
			<div
				className="size-5 flex items-center justify-center"
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

import type { AllTexts } from "@/utils/supabase";
import clsx from "clsx";
import { DynamicText } from "./DynamicText";

export const getTextItemId = (textId: number) => `text-${textId}`;

export function TextItem({
	text,
	hover = true,
}: { text: AllTexts[number]; hover?: boolean }) {
	return (
		<div
			id={getTextItemId(text.id)}
			className={clsx(
				"px-2 py-4 print:px-0.5 print:py-1 flex items-stretch gap-3 text-black dark:text-jubilateBlue-400",
				hover && "hover:bg-jubilateBlue-100 dark:hover:bg-gray-700",
			)}
		>
			<div className="w-12 justify-center border-r font-bold flex items-center shrink-0">
				{text.id}
			</div>
			<div className="grow flex flex-col">
				<DynamicText
					className="text-black dark:text-white font-semibold"
					text={text.title}
				/>
				<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
					{text.content.substring(0, 100)}
					{text.content.length > 100 && "..."}
				</p>
			</div>
		</div>
	);
}

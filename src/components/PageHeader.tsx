import clsx from "clsx";
import type { ReactNode } from "react";
import { BackButton } from "./BackButton";

type PageHeaderProps = {
	variant: "list" | "detail";
	title?: ReactNode;
	left?: ReactNode;
	right?: ReactNode;
	className?: string;
};

const PageHeader = ({
	variant,
	title,
	left,
	right,
	className,
}: PageHeaderProps) => {
	const isList = variant === "list";

	return (
		<header
			className={clsx(
				"flex justify-between items-center sticky top-0 z-10",
				isList
					? "bg-jubilateBlue-500 dark:bg-slate-900 px-6 py-4 gap-4"
					: "bg-white dark:bg-gray-900 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 px-4 md:px-6 py-2 md:py-4",
				className,
			)}
		>
			{left !== undefined ? (
				left
			) : (
				<BackButton variant={isList ? "header" : "default"} />
			)}
			{title != null &&
				(typeof title === "string" ? (
					<h1
						className={clsx(
							"font-flame text-xl lg:text-3xl",
							isList
								? "text-white"
								: "text-jubilateBlue-500 dark:text-jubilateBlue-400",
						)}
					>
						{title}
					</h1>
				) : (
					title
				))}
			{right ?? <span />}
		</header>
	);
};

export { PageHeader };
export type { PageHeaderProps };

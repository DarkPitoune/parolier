import { MinusIcon, PlusIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import type { ReactNode } from "react";
import { ResetIcon } from "./ResetIcon";

const ACCENT_FILL = "fill-jubilateBlue-500 dark:fill-jubilateBlue-400";
const STEP_BUTTON =
	"grid h-8 place-items-center rounded-full transition-colors hover:bg-jubilateBlue-100 dark:hover:bg-slate-600";

/**
 * The section label is the only heading here, so it takes Flame and the setting
 * names stay body text. Reversing the two leaves nothing above the names to
 * group them, which is the shape the panel had before.
 */
function SettingsSection({
	label,
	children,
}: { label: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-2">
			<h2 className="flex items-center gap-2.5 px-0.5 font-flame text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
				{label}
				<span
					aria-hidden="true"
					className="flex-1 h-px bg-gray-200 dark:bg-gray-700"
				/>
			</h2>
			<div className="flex flex-col overflow-hidden rounded-xl border border-jubilateBlue-200 dark:border-slate-600 divide-y divide-jubilateBlue-200 dark:divide-slate-600 bg-jubilateBlue-100/40 dark:bg-slate-700/40">
				{children}
			</div>
		</section>
	);
}

type SettingRowProps = {
	name: ReactNode;
	children: ReactNode;
	/** Draws the row as depending on the one above it. */
	nested?: boolean;
	ariaLabel?: string;
};

function SettingRow({ name, children, nested, ariaLabel }: SettingRowProps) {
	return (
		<div
			aria-label={ariaLabel}
			className={clsx(
				"relative flex min-h-[52px] items-center gap-3.5 px-3.5",
				nested && "pl-8",
			)}
		>
			{nested && (
				<span
					aria-hidden="true"
					className="absolute inset-y-0 left-[17px] w-px bg-gray-200 dark:bg-gray-600"
				/>
			)}
			<span className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-medium leading-tight">
				{name}
			</span>
			{children}
		</div>
	);
}

function SettingToggle({
	label,
	checked,
	onChange,
}: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={clsx(
				"relative h-6 w-11 shrink-0 rounded-full transition-colors",
				checked
					? "bg-jubilateBlue-500 dark:bg-jubilateBlue-400"
					: "bg-slate-300 dark:bg-slate-500 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]",
			)}
		>
			<span
				className={clsx(
					"absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform",
					checked && "translate-x-5",
				)}
			/>
		</button>
	);
}

type SegmentedOption<T> = {
	value: T;
	label: string;
	icon: ReactNode;
};

function SettingSegmented<T extends string | number>({
	value,
	options,
	onChange,
	withLabels,
}: {
	value: T;
	options: readonly SegmentedOption<T>[];
	onChange: (value: T) => void;
	/** Spells the label out beside the icon once the panel has room for it. */
	withLabels?: boolean;
}) {
	return (
		<div className="flex shrink-0 gap-1 rounded-full bg-slate-300 dark:bg-slate-700 p-1">
			{options.map((option) => (
				<button
					key={String(option.value)}
					type="button"
					onClick={() => onChange(option.value)}
					aria-pressed={value === option.value}
					aria-label={option.label}
					title={option.label}
					className={clsx(
						"flex items-center justify-center gap-1 rounded-full px-3 py-1 transition-colors",
						value === option.value
							? "bg-white dark:bg-slate-800 text-jubilateBlue-500 dark:text-jubilateBlue-400"
							: "bg-transparent",
					)}
				>
					{option.icon}
					{withLabels && (
						<span className="text-sm hidden md:block">{option.label}</span>
					)}
				</button>
			))}
		</div>
	);
}

type SettingStepperProps = {
	label: string;
	value: string;
	/** Colours the value once it has moved off its resting position. */
	active: boolean;
	onStep: (increment: number) => void;
	onReset: () => void;
};

function SettingStepper({
	label,
	value,
	active,
	onStep,
	onReset,
}: SettingStepperProps) {
	return (
		<div className="flex shrink-0 items-center gap-0.5 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-0.5">
			<button
				type="button"
				onClick={() => onStep(-1)}
				aria-label={`${label} : diminuer`}
				className={clsx(STEP_BUTTON, "w-8")}
			>
				<MinusIcon className={clsx("w-4", ACCENT_FILL)} />
			</button>
			<span
				className={clsx(
					"min-w-10 text-center font-flame text-lg tabular-nums",
					active && "text-jubilateBlue-500 dark:text-jubilateBlue-400",
				)}
			>
				{value}
			</span>
			<button
				type="button"
				onClick={() => onStep(1)}
				aria-label={`${label} : augmenter`}
				className={clsx(STEP_BUTTON, "w-8")}
			>
				<PlusIcon className={clsx("w-4", ACCENT_FILL)} />
			</button>
			<button
				type="button"
				onClick={onReset}
				aria-label={`${label} : réinitialiser`}
				className={clsx(STEP_BUTTON, "w-7 opacity-60 hover:opacity-100")}
			>
				<ResetIcon className={clsx("w-3.5", ACCENT_FILL)} />
			</button>
		</div>
	);
}

export {
	ACCENT_FILL,
	type SegmentedOption,
	SettingRow,
	SettingSegmented,
	SettingStepper,
	SettingToggle,
	SettingsSection,
};

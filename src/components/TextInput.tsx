import clsx from "clsx";

type TextInputProps = {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	onBlur?: () => void;
};

export const TextInput = ({
	value,
	onChange,
	label,
	onBlur,
}: TextInputProps) => (
	<label className="text-sm sm:text-base font-medium text-black dark:text-white">
		{label && `${label} :`}
		<div className="flex flex-col items-center">
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				className="w-full text-sm sm:text-base peer focus:outline-none bg-transparent"
			/>
			<hr
				className={clsx(
					"border-b-0.5 peer-focus:border-indigo-500 transition-all w-1/2 peer-focus:w-full",
					value.length === 0 ? "border-gray-300" : "border-transparent",
				)}
			/>
		</div>
	</label>
);

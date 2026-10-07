import {
	Combobox,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
} from "@headlessui/react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { useState } from "react";

type SetlistTagsInputProps = {
	value: string[];
	suggestions: string[];
	onChange: (tags: string[]) => void;
};

type Option = { tag: string; isNew: boolean };

const normalize = (tag: string) => tag.trim().toLocaleLowerCase("fr");

export const SetlistTagsInput = ({
	value,
	suggestions,
	onChange,
}: SetlistTagsInputProps) => {
	const [query, setQuery] = useState("");

	const selected = new Set(value.map(normalize));
	const trimmed = query.trim();
	const matches = suggestions.filter(
		(tag) =>
			!selected.has(normalize(tag)) &&
			normalize(tag).includes(normalize(trimmed)),
	);
	const exists =
		selected.has(normalize(trimmed)) ||
		suggestions.some((tag) => normalize(tag) === normalize(trimmed));
	const options: Option[] = [
		...matches.map((tag) => ({ tag, isNew: false })),
		...(trimmed && !exists ? [{ tag: trimmed, isNew: true }] : []),
	];

	const addTag = (option: Option | null) => {
		if (!option) return;
		setQuery("");
		if (selected.has(normalize(option.tag))) return;
		onChange([...value, option.tag]);
	};

	const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

	return (
		<div className="text-sm sm:text-base font-medium text-black dark:text-white">
			Tags :
			<div className="flex flex-wrap items-center gap-1 pt-1">
				{value.map((tag) => (
					<span
						key={tag}
						className="inline-flex items-center gap-1 rounded-full bg-jubilateBlue-100 dark:bg-jubilateBlue-700 text-jubilateBlue-700 dark:text-white pl-3 pr-1 py-0.5 text-sm"
					>
						{tag}
						<button
							type="button"
							aria-label={`Retirer ${tag}`}
							onClick={() => removeTag(tag)}
							className="rounded-full hover:bg-jubilateBlue-200 dark:hover:bg-jubilateBlue-500"
						>
							<XMarkIcon className="size-4" />
						</button>
					</span>
				))}
				<Combobox<Option | null>
					value={null}
					onChange={addTag}
					onClose={() => setQuery("")}
				>
					<div className="relative grow min-w-32">
						<ComboboxInput
							className="w-full text-base bg-transparent focus:outline-hidden py-0.5 placeholder:text-gray-400"
							placeholder="Ajouter un tag..."
							displayValue={() => query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Backspace" && query === "" && value.length > 0)
									removeTag(value[value.length - 1]);
							}}
						/>
						<ComboboxOptions
							anchor="bottom start"
							className="z-30 w-(--input-width) min-w-48 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1 empty:invisible [--anchor-gap:4px]"
						>
							{options.map((option) => (
								<ComboboxOption
									key={`${option.isNew}-${option.tag}`}
									value={option}
									className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-black dark:text-white data-focus:bg-jubilateBlue-100 dark:data-focus:bg-gray-700"
								>
									{option.isNew ? (
										<>
											<PlusIcon className="size-4 text-jubilateGreen-500" />
											Créer « {option.tag} »
										</>
									) : (
										option.tag
									)}
								</ComboboxOption>
							))}
						</ComboboxOptions>
					</div>
				</Combobox>
			</div>
		</div>
	);
};

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const SlideFinder = () => {
	const [inputVisible, setInputVisible] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	const handleInput = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				navigate(`/slides/${inputValue}`);
				setInputVisible(false);
				setInputValue("");
			}
		},
		[navigate, inputValue],
	);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (/^\d$/.test(e.key)) {
				setInputVisible(true);
				inputRef.current?.focus();
			}
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, []);

	return (
		<div
			className={clsx(
				"absolute left-1/2 -translate-x-1/2 transition-all duration-300 ease-in-out",
				inputVisible ? "bottom-4" : "-bottom-12 scale-50",
			)}
		>
			<input
				ref={inputRef}
				type="number"
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value.slice(0, 3))}
				onKeyDown={handleInput}
				className="rounded-full bg-gray-700 px-2 text-white outline-none w-11"
				onFocus={() => setInputVisible(true)}
				onBlur={() => {
					setInputVisible(false);
					setInputValue("");
				}}
			/>
		</div>
	);
};

export { SlideFinder };

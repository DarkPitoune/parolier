import { ChevronLeftIcon } from "@heroicons/react/16/solid";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
	const navigate = useNavigate();

	return (
		<button
			className="rounded-full hover:bg-jubilateBlue-100 dark:hover:bg-slate-800"
			type="button"
			onClick={() => navigate(-1)}
		>
			<ChevronLeftIcon className="w-10 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
		</button>
	);
};

export { BackButton };

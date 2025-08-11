import supabase from "@/utils/supabase";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/16/solid";
import { Link } from "react-router-dom";

const ZapettePage = () => {
	const navigate = useNavigate();

	const sendOrder = useCallback(async (order: "NEXT" | "PREVIOUS") => {
		try {
			await supabase.channel("remote").send({
				type: "broadcast",
				event: "click",
				payload: { order },
			});
		} catch (error) {
			console.error("Failed to send order:", error);
		}
	}, []);

	const handleNext = () => sendOrder("NEXT");
	const handlePrevious = () => sendOrder("PREVIOUS");

	return (
		<div className="bg-white dark:bg-gray-800">
			{/* Header */}
			<div className="flex justify-between items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky bg-white dark:bg-gray-900">
				<Link
					className="bg-jubilateBlue-500 dark:bg-jubilateBlue-400 rounded-full hover:bg-jubilateBlue-700 text-white p-2 transition-colors duration-200"
					to="/"
				>
					<ChevronLeftIcon className="w-6 h-6" />
				</Link>
				<h1 className="text-2xl font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400">
					Zapette
				</h1>
				<div className="w-10" /> {/* Spacer for centering */}
			</div>

			{/* Main Content */}
			<div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
				<div className="text-center mb-8">
					<p className="text-gray-600 dark:text-gray-400 text-lg">
						La zappette pour les slides
					</p>
				</div>

				<div className="flex gap-6 mb-8">
					<button
						onClick={handlePrevious}
						className="bg-jubilateBlue-500 hover:bg-jubilateBlue-700 active:bg-jubilateBlue-800 text-white font-bold py-6 px-8 rounded-lg text-2xl transition-colors duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
					>
						<ChevronLeftIcon className="w-8 h-8" />
						Précédent
					</button>

					<button
						onClick={handleNext}
						className="bg-jubilateGreen hover:bg-green-600 active:bg-green-700 text-white font-bold py-6 px-8 rounded-lg text-2xl transition-colors duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
					>
						Suivant
						<ChevronRightIcon className="w-8 h-8" />
					</button>
				</div>

				<div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm max-w-md">
					<p>
						Si vous ou l'ordinateur des slides n'est pas connecté à internet, ça ne marchera pas.
					</p>
				</div>
			</div>
		</div>
	);
};

export { ZapettePage }; 
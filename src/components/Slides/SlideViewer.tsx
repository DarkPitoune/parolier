import type { Strophe } from "@/assets/types";
import { setlistLengthQuery } from "@/utils/supabase";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const SlideViewer = ({ strophes }: { strophes: Strophe[] }) => {
	const { stepNumber, setlistId } = useParams();
	const navigate = useNavigate();
	const [step, setStep] = useState(0);
	const [setlistLength, setSetlistLength] = useState(0);

	useEffect(() => {
		if (setlistId)
			setlistLengthQuery(setlistId).then(({ data }) => {
				if (data) setSetlistLength(data[0].position);
			});
	}, [setlistId]);

	const plus1 = useCallback(() => {
		setStep((s) => Math.min(s + 1, strophes.length - 1));
		if (
			step === strophes.length - 1 &&
			setlistId &&
			stepNumber &&
			Number(stepNumber) < setlistLength
		)
			navigate(`/setlists/${setlistId}/steps/${Number(stepNumber) + 1}/slide`);
	}, [navigate, setlistId, stepNumber, strophes.length, step, setlistLength]);

	const minus1 = useCallback(() => {
		setStep((s) => Math.max(0, s - 1));
		if (step === 0 && setlistId && stepNumber && Number(stepNumber) > 0)
			navigate(`/setlists/${setlistId}/steps/${Number(stepNumber) - 1}/slide`);
	}, [navigate, setlistId, step, stepNumber]);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "f" || e.key === "F")
				return document.body.requestFullscreen();
			if (e.key === "ArrowRight") plus1();
			if (e.key === "ArrowLeft") minus1();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [minus1, plus1]);

	return (
		<div
			data-type={strophes[step].type}
			className="text-6xl text-center data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold"
		>
			{strophes[step].content.map((line, lineIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
				<div className="col-span-2" key={lineIndex}>
					{line.text}
				</div>
			))}
			<div className="absolute inset-0 flex items-stretch justify-stretch">
				<div className="grow" onTouchStart={minus1} />
				<div className="grow" onTouchStart={plus1} />
			</div>
		</div>
	);
};

export { SlideViewer };

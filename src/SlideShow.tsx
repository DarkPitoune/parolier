import { useEffect, useState } from "react";
import { Strophe } from "./assets/types";

function SlideShow({ strophes }: { strophes: Strophe[] }) {
  const [step, setStep] = useState(0);

  const plus1 = () => setStep((s) => Math.min(s + 1, strophes.length - 1));
  const minus1 = () => setStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") plus1();
      if (e.key === "ArrowLeft") minus1();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      data-type={strophes[step].type}
      className="absolute inset-0 flex flex-col justify-center items-center text-6xl text-center text-white bg-gray-950 data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold"
    >
      {strophes[step].content.map((line, lineIndex) => (
        <div className="col-span-2" key={lineIndex}>
          {line.text}
        </div>
      ))}
      <div className="absolute inset-0 flex items-stretch justify-stretch">
        <button className="grow" onClick={minus1}></button>
        <button className="grow" onClick={plus1}></button>
      </div>
    </div>
  );
}

export { SlideShow };

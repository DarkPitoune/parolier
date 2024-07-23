import { useEffect, useState } from "react";
import { Strophe } from "./assets/types";

function SlideShow({ strophes }: { strophes: Strophe[] }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setStep((s) => Math.min(s + 1, strophes.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="whitespace-pre-wrap absolute inset-0 flex justify-center items-center text-6xl text-center text-white">
      {strophes[step].text}
    </div>
  );
}

export { SlideShow };

import { useSetAtom } from "jotai";
import { useRef, useEffect } from "react";
import { slideHelpAtom } from "../Contexts/SettingsContext";

const SlideHelp = () => {
	const modalRef = useRef<HTMLDivElement>(null);
	const setSlideHelp = useSetAtom(slideHelpAtom);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				modalRef.current &&
				!modalRef.current.contains(event.target as Node)
			) {
				setSlideHelp(false);
			}
		};
		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setSlideHelp(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscapeKey);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, [setSlideHelp]);

	return (
		<div className="absolute inset-0 z-50 bg-black/50 flex justify-center items-center">
			<div
				className="bg-gray-950 rounded-lg flex flex-col overflow-hidden"
				ref={modalRef}
			>
				<h1 className="text-4xl font-bold bg-gray-800 py-4 px-8">
					Bienvenue dans le mode Présentation
				</h1>
				<div className="py-4 px-8 text-xl leading-8">
					<p className="text-gray-400 italic">
						Utilisez les commandes suivantes pour naviguer :
					</p>
					<ul>
						<li>
							<span className="font-bold">F</span> : Passer en plein écran
						</li>
						<li>
							<span className="font-bold">⬅️/➡️</span> : Slide précédente/suivante
							(si elle existe)
						</li>
						<li>
							<span className="font-bold">Echap</span> : Quitter le mode
							Présentation
						</li>
						<li>
							<span className="font-bold">Chiffres + Entrée</span> : Naviguer
							vers un morceau avec son numéro
						</li>
						<li>
							<span className="font-bold">H</span> : Afficher/Cacher cette aide
						</li>
						<li>
							<span className="font-bold">T</span> : Afficher la croix Jubilate
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
};

export { SlideHelp };

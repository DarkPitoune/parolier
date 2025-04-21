import clsx from "clsx";
import { useState, useRef, useEffect, type TouchEventHandler } from "react";

interface Tab {
	id?: string | number;
	title: React.ReactNode;
	content: React.ReactNode;
}

interface SwipeableTabsProps {
	tabs: Tab[];
	initialTab?: number;
	tabsClassName?: string;
	contentClassName?: string;
}

export default function SwipeableTabs({
	tabs,
	initialTab = 0,
	tabsClassName = "",
	contentClassName = "",
}: SwipeableTabsProps) {
	const [activeTab, setActiveTab] = useState(initialTab);
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [startY, setStartY] = useState(0); // Ajout pour détecter la direction
	const [translateX, setTranslateX] = useState(0);
	const [isHorizontalSwipe, setIsHorizontalSwipe] = useState(false); // Nouvelle état pour déterminer si le swipe est horizontal
	const tabsRef = useRef<HTMLDivElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const swipeThreshold = 80; // Minimum swipe distance to change tabs

	// Center active tab on tab change
	useEffect(() => {
		if (tabsRef.current) {
			const tabsContainer = tabsRef.current;
			const activeTabElement = tabsContainer.children[activeTab];

			if (activeTabElement instanceof HTMLElement) {
				const containerWidth = tabsContainer.offsetWidth;
				const activeTabWidth = activeTabElement.offsetWidth;
				const activeTabLeft = activeTabElement.offsetLeft;

				const scrollPosition =
					activeTabLeft - containerWidth / 2 + activeTabWidth / 2;
				tabsContainer.scrollTo({ left: scrollPosition, behavior: "smooth" });
			}
		}
	}, [activeTab]);

	// Handle tab click
	const handleTabClick = (index: number) => {
		setActiveTab(index);
		setTranslateX(0);
	};

	// Touch handlers for swipe
	const handleTouchStart: TouchEventHandler<HTMLDivElement> = (e) => {
		setIsDragging(true);
		setStartX(e.touches[0].clientX);
		setStartY(e.touches[0].clientY); // Enregistrer la position Y initiale
		setIsHorizontalSwipe(false); // Réinitialiser la détection de direction
	};

	const handleTouchMove: TouchEventHandler<HTMLDivElement> = (e) => {
		if (!isDragging) return;

		const currentX = e.touches[0].clientX;
		const currentY = e.touches[0].clientY;
		const differenceX = currentX - startX;
		const differenceY = currentY - startY;

		// Déterminer si le swipe est horizontal ou vertical lors du premier mouvement significatif
		if (!isHorizontalSwipe) {
			// Si la direction n'est pas encore déterminée et que le mouvement est significatif
			if (Math.abs(differenceX) > 10 || Math.abs(differenceY) > 10) {
				// Si le mouvement horizontal est plus important que le mouvement vertical
				if (Math.abs(differenceX) > Math.abs(differenceY)) {
					setIsHorizontalSwipe(true);
				} else {
					// C'est un swipe vertical, pas besoin d'interférer
					setIsDragging(false);
					return;
				}
			}
		}

		// Si ce n'est pas un swipe horizontal, ne pas continuer le traitement
		if (!isHorizontalSwipe) return;

		// Calcul du maximum de distance de glissement (largeur du conteneur)
		const containerWidth = containerRef.current
			? containerRef.current.offsetWidth
			: 0;
		const maxDrag = containerWidth * 0.5;

		// Limiter la distance de glissement
		let newTranslateX = differenceX;
		if (
			(activeTab === 0 && differenceX > 0) ||
			(activeTab === tabs.length - 1 && differenceX < 0)
		) {
			newTranslateX = differenceX * 0.2; // Résistance aux bords
		}

		// Appliquer des limites pour éviter un glissement excessif
		newTranslateX = Math.max(Math.min(newTranslateX, maxDrag), -maxDrag);

		// Si c'est un swipe horizontal, prévenir le comportement par défaut pour éviter le scroll vertical
		if (isHorizontalSwipe) {
			e.preventDefault();
		}

		setTranslateX(newTranslateX);
	};

	const handleTouchEnd = () => {
		if (!isDragging || !isHorizontalSwipe) return;

		if (translateX > swipeThreshold && activeTab > 0) {
			setActiveTab(activeTab - 1);
		} else if (translateX < -swipeThreshold && activeTab < tabs.length - 1) {
			setActiveTab(activeTab + 1);
		}

		setIsDragging(false);
		setIsHorizontalSwipe(false);
		setTranslateX(0);
	};

	return (
		<div className="flex flex-col w-full">
			{/* Tabs Navigation */}
			<div
				className={clsx(
					"bg-white dark:bg-gray-800 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700",
					tabsClassName,
				)}
			>
				<div
					ref={tabsRef}
					className="flex overflow-x-auto scrollbar-hide"
					style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
				>
					{tabs.map((tab, index) => (
						<button
							type="button"
							key={tab.id || index}
							className={clsx(
								"px-4 py-2 whitespace-nowrap font-medium text-sm transition-colors duration-200 relative",
								activeTab === index
									? "text-jubilateBlue-500 dark:text-jubilateBlue-300"
									: "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
							)}
							onClick={() => handleTabClick(index)}
						>
							{tab.title}
							{activeTab === index && (
								<div className="absolute bottom-0 left-0 w-full h-0.5 bg-jubilateBlue-500 dark:bg-jubilateBlue-300" />
							)}
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<div
				ref={containerRef}
				className={clsx(
					"relative overflow-hidden touch-pan-y",
					contentClassName,
				)}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
				onTouchCancel={handleTouchEnd}
			>
				<div
					className="flex transition-transform duration-300 ease-out"
					style={{
						transform: `translateX(calc(-${
							(activeTab * 100) / tabs.length
						}% + ${isDragging && isHorizontalSwipe ? translateX : 0}px))`,
						width: `${tabs.length * 100}%`,
					}}
				>
					{tabs.map((tab, index) => (
						<div
							key={tab.id || index}
							className="flex-shrink-0 w-full"
							style={{ width: `${100 / tabs.length}%` }}
						>
							{tab.content}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

import { useEffect } from "react";

const TouchScreenListener = () => {
	let eventState: PointerEvent[] = [];
	let initialDistance = 0;
	let currentDistance = 0;
	const listenerElement = document.body;

	const pointerDownHandler = (e: PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		eventState = [...eventState, e];
		if (eventState.length === 2) {
			initialDistance = Math.hypot(
				eventState[0].clientX - e.clientX,
				eventState[0].clientY - e.clientY,
			);
			const loadBar = document.getElementById("loadBar");
			if (loadBar) loadBar.style.display = "block";
		}
	};

	const pointerMoveHandler = (e: PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		// update the record value
		const index = eventState.findIndex(
			(event) => event.pointerId === e.pointerId,
		);
		eventState[index] = e;
		// if there are two pointers
		if (eventState.length === 2) {
			currentDistance = Math.hypot(
				eventState[0].clientX - eventState[1].clientX,
				eventState[0].clientY - eventState[1].clientY,
			);
			const loadBar = document.getElementById("loadBar");
			if (loadBar)
				loadBar.style.width = `${100 * (1.4 - currentDistance / initialDistance)}vw`;
		}
	};

	const pointerUpHandler = (e: PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		// remove the event from the list
		eventState = eventState.filter((event) => event.pointerId !== e.pointerId);
		const loadBar = document.getElementById("loadBar");
		if (loadBar) loadBar.style.display = "none";
		if (currentDistance / initialDistance < 0.8 && document.fullscreenEnabled) {
			document.exitFullscreen();
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: vanilla JS here, no rerender
	useEffect(() => {
		if (!listenerElement) return;
		listenerElement.addEventListener("pointerdown", pointerDownHandler);
		listenerElement.addEventListener("pointermove", pointerMoveHandler);
		listenerElement.addEventListener("pointerup", pointerUpHandler);
		listenerElement.addEventListener("pointerout", pointerUpHandler);
		listenerElement.addEventListener("pointerleave", pointerUpHandler);
		return () => {
			listenerElement.removeEventListener("pointerdown", pointerDownHandler);
			listenerElement.removeEventListener("pointermove", pointerMoveHandler);
			listenerElement.removeEventListener("pointerup", pointerUpHandler);
			listenerElement.removeEventListener("pointerout", pointerUpHandler);
			listenerElement.removeEventListener("pointerleave", pointerUpHandler);
		};
	}, []);
	return (
		<div
			id="loadBar"
			className="absolute bottom-0 border border-x-jubilateBlue-600"
		/>
	);
};

export { TouchScreenListener };

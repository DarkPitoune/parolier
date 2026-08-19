import { useCallback, useEffect, useRef } from "react";

/** Matches the native long-press delay on both platforms, and SongPage's tap timer. */
const LONG_PRESS_MS = 500;
/** Same threshold SwipeableTabs uses to tell a gesture from finger tremor. */
const MOVE_TOLERANCE_PX = 10;

type LongPressOptions = {
	onLongPress: () => void;
	/** When false, nothing is attached at all — read-only screens pay nothing. */
	enabled?: boolean;
	delayMs?: number;
	moveTolerancePx?: number;
};

/**
 * Long-press that survives a scrolling page.
 *
 * The move/up listeners live on `window`, not on the element: as soon as the
 * page scrolls, the element slides out from under the finger and element-level
 * handlers stop firing, which would leave the timer running and pop a sheet
 * open mid-scroll.
 */
function useLongPress({
	onLongPress,
	enabled = true,
	delayMs = LONG_PRESS_MS,
	moveTolerancePx = MOVE_TOLERANCE_PX,
}: LongPressOptions) {
	const timerRef = useRef<ReturnType<typeof setTimeout>>();
	const detachRef = useRef<() => void>();
	const firedRef = useRef(false);

	const cancel = useCallback(() => {
		clearTimeout(timerRef.current);
		timerRef.current = undefined;
		detachRef.current?.();
		detachRef.current = undefined;
	}, []);

	useEffect(() => cancel, [cancel]);

	const onPointerDown = useCallback(
		(event: React.PointerEvent) => {
			if (!enabled) return;
			// Right and middle click are not a long press.
			if (event.pointerType === "mouse" && event.button !== 0) return;

			cancel();
			firedRef.current = false;
			const originX = event.clientX;
			const originY = event.clientY;

			const handleMove = (moveEvent: MouseEvent) => {
				const distance = Math.hypot(
					moveEvent.clientX - originX,
					moveEvent.clientY - originY,
				);
				if (distance > moveTolerancePx) cancel();
			};
			// Scroll does not bubble, so it has to be caught on the way down.
			const scrollOptions = { capture: true, passive: true } as const;
			window.addEventListener("pointermove", handleMove);
			window.addEventListener("pointerup", cancel);
			window.addEventListener("pointercancel", cancel);
			window.addEventListener("scroll", cancel, scrollOptions);

			detachRef.current = () => {
				window.removeEventListener("pointermove", handleMove);
				window.removeEventListener("pointerup", cancel);
				window.removeEventListener("pointercancel", cancel);
				window.removeEventListener("scroll", cancel, scrollOptions);
			};

			timerRef.current = setTimeout(() => {
				firedRef.current = true;
				cancel();
				navigator.vibrate?.(10);
				// Otherwise the press leaves a stray selection behind the sheet.
				window.getSelection()?.removeAllRanges();
				onLongPress();
			}, delayMs);
		},
		[cancel, delayMs, enabled, moveTolerancePx, onLongPress],
	);

	/** Android pops a context menu on long press even with user-select disabled. */
	const onContextMenu = useCallback(
		(event: React.SyntheticEvent) => {
			if (enabled) event.preventDefault();
		},
		[enabled],
	);

	/** Swallows the click the browser synthesises after the press fired. */
	const onClickCapture = useCallback((event: React.MouseEvent) => {
		if (!firedRef.current) return;
		firedRef.current = false;
		event.preventDefault();
		event.stopPropagation();
	}, []);

	return { onPointerDown, onContextMenu, onClickCapture };
}

export { useLongPress };

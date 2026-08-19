import { act, fireEvent, render, screen } from "@testing-library/react";
import { useLongPress } from "./useLongPress";

function Target({
	onLongPress,
	enabled,
}: { onLongPress: () => void; enabled?: boolean }) {
	const handlers = useLongPress({ onLongPress, enabled });
	return (
		<div data-testid="target" {...handlers}>
			strophe
		</div>
	);
}

// jsdom has no PointerEvent, so fireEvent.pointerDown drops clientX/clientY.
// The hook attaches its move/up listeners on window imperatively, so a plain
// MouseEvent — which jsdom does implement with working coordinates — reaches
// them untouched.
const movePointer = (clientX: number, clientY: number) =>
	act(() => {
		window.dispatchEvent(
			new MouseEvent("pointermove", { clientX, clientY, bubbles: true }),
		);
	});

const releasePointer = () =>
	act(() => {
		window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
	});

const pressTarget = () =>
	fireEvent.pointerDown(screen.getByTestId("target"), {
		pointerType: "touch",
		clientX: 0,
		clientY: 0,
		button: 0,
	});

const advance = (ms: number) =>
	act(() => {
		vi.advanceTimersByTime(ms);
	});

describe("useLongPress", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("fires once the press is held still for 500ms", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} />);

		pressTarget();
		advance(500);

		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it("does not fire on a press released early", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} />);

		pressTarget();
		advance(400);
		releasePointer();
		advance(200);

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("does not fire once the finger travels — that is a scroll", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} />);

		pressTarget();
		movePointer(0, 15);
		advance(500);

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("still fires through finger tremor", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} />);

		pressTarget();
		movePointer(3, 4); // 5px — below the 10px tolerance
		advance(500);

		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it("cancels when the page scrolls under the finger", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} />);

		pressTarget();
		act(() => {
			window.dispatchEvent(new Event("scroll"));
		});
		advance(500);

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("cancels on pointercancel", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} />);

		pressTarget();
		act(() => {
			window.dispatchEvent(new MouseEvent("pointercancel", { bubbles: true }));
		});
		advance(500);

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("fires on a held left mouse button — the desktop path", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} />);

		fireEvent.pointerDown(screen.getByTestId("target"), {
			pointerType: "mouse",
			button: 0,
			clientX: 0,
			clientY: 0,
		});
		advance(500);

		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it("ignores right click", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} />);

		fireEvent.pointerDown(screen.getByTestId("target"), {
			pointerType: "mouse",
			button: 2,
			clientX: 0,
			clientY: 0,
		});
		advance(500);

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("attaches nothing when disabled", () => {
		const onLongPress = vi.fn();
		render(<Target onLongPress={onLongPress} enabled={false} />);

		pressTarget();
		advance(500);

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("does not fire after unmount", () => {
		const onLongPress = vi.fn();
		const { unmount } = render(<Target onLongPress={onLongPress} />);

		pressTarget();
		unmount();
		advance(500);

		expect(onLongPress).not.toHaveBeenCalled();
	});
});

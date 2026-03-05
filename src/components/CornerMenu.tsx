export const CornerMenu = ({ onOpen }: { onOpen: () => void }) => {
	return (
		<button
			onClick={onOpen}
			type="button"
			className="fixed -bottom-1 -right-1 z-10 print:hidden size-14 rounded-full bg-jubilateBlue-500 flex items-center justify-center"
		>
			<img className="h-8" src="/svg/Jubilate_Croix.svg" alt="Menu" />
		</button>
	);
};

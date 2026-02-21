import { useIsFetching } from "@tanstack/react-query";

export const BackgroundFetchIndicator = () => {
	const isFetching = useIsFetching();
	if (!isFetching) return null;
	return (
		<div className="fixed top-0 left-0 right-0 h-0.5 bg-jubilateBlue-500 animate-pulse z-50" />
	);
};

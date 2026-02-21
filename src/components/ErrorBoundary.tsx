import * as Sentry from "@sentry/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback ?? (
					<div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8 text-center">
						<p className="text-lg text-gray-700 dark:text-gray-300">
							Une erreur est survenue lors de l'affichage de cette page.
						</p>
						<button
							type="button"
							onClick={() => this.setState({ hasError: false })}
							className="px-4 py-2 rounded-full bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white hover:bg-jubilateBlue-600 dark:hover:bg-jubilateBlue-300 transition-colors"
						>
							Réessayer
						</button>
					</div>
				)
			);
		}

		return this.props.children;
	}
}

export { ErrorBoundary };

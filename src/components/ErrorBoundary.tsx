import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * React class-based error boundary.
 *
 * Catches unhandled rendering errors anywhere in its subtree and shows a
 * recovery UI instead of a blank screen. Errors are logged to the console
 * (class components cannot import the ES-module logger easily, so we fall
 * back to console.error which is acceptable here — this is a last-resort
 * catch-all, not application logic).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PlayHub] Unhandled render error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) return fallback(error, this.reset);

      return (
        <div
          role="alert"
          className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-error">error</span>
          </div>
          <div className="flex flex-col gap-2 max-w-sm">
            <h1 className="font-bold text-[22px] text-on-background">Something went wrong</h1>
            <p className="text-[14px] text-on-surface-variant leading-relaxed">
              An unexpected error occurred. Your bookings and data are safe.
            </p>
            {import.meta.env.DEV && (
              <pre className="mt-2 text-left text-[11px] text-error/80 bg-error-container/10 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
                {error.message}
              </pre>
            )}
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={this.reset}
              className="h-[48px] rounded-full bg-primary text-on-primary font-semibold text-[15px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.replace('/home')}
              className="h-[48px] rounded-full border border-outline-variant text-on-surface font-semibold text-[15px] hover:bg-surface-container transition-colors cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

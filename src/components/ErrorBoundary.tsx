import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  info?: string;
}

const INITIAL_STATE: ErrorBoundaryState = {
  hasError: false,
  error: undefined,
  info: undefined,
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { ...INITIAL_STATE };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const payload = {
      componentStack: info.componentStack,
    };

    logger.error('Unhandled error captured by ErrorBoundary', {
      error,
      ...payload,
    });

    if (typeof window !== 'undefined') {
      (window as typeof window & {
        __KR_TRACKER_LAST_ERROR__?: {
          error: { message: string; stack?: string; name?: string };
          componentStack?: string;
          timestamp: string;
        };
      }).__KR_TRACKER_LAST_ERROR__ = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        componentStack: info.componentStack,
        timestamp: new Date().toISOString(),
      };
    }

    this.setState({ info: info.componentStack });
  }

  private handleReset = () => {
    this.setState({ ...INITIAL_STATE });

    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (resetError) {
        logger.error('ErrorBoundary onReset handler threw', { error: resetError });
      }
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const { error, info } = this.state;

      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="max-w-xl space-y-2">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground">
              An unexpected error occurred while rendering the application. Try resetting the view to continue.
            </p>
          </div>
          {isDev && error ? (
            <details className="w-full max-w-xl rounded border border-destructive/50 bg-destructive/10 p-4 text-left text-sm">
              <summary className="cursor-pointer font-medium">Debug details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                {error.name ? `${error.name}: ${error.message}` : error.message}
              </pre>
              {error.stack ? (
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs opacity-70">{error.stack}</pre>
              ) : null}
              {info ? (
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs opacity-70">{info}</pre>
              ) : null}
            </details>
          ) : null}
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded bg-primary px-4 py-2 text-primary-foreground shadow hover:bg-primary/90"
          >
            Reset view
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

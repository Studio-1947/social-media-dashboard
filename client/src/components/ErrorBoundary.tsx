import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Without this, an uncaught error anywhere in the render tree unmounts the
 * ENTIRE app and leaves a silent blank white page — no message, no stack trace
 * visible to anyone without devtools open. That's exactly what happened when
 * /admin rendered Sidebar without its required SelectionProvider ancestor: the
 * hook threw, and there was nothing here to catch it and show anything at all.
 *
 * React error boundaries must be class components — there is still no hooks
 * equivalent of `componentDidCatch`/`getDerivedStateFromError`.
 */
interface State {
    error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Caught a render error:', error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-dvh flex items-center justify-center bg-primary-50 p-6">
                    <div className="max-w-lg w-full bg-white rounded-2xl shadow-modern-lg border border-primary-100 p-8 text-center">
                        <div className="text-lg font-bold text-primary-900 mb-2">
                            Something went wrong
                        </div>
                        <p className="text-sm text-primary-600 mb-4">
                            This page hit an unexpected error instead of loading. Reloading
                            usually fixes a one-off glitch; if it keeps happening, share this
                            message with support.
                        </p>
                        <pre className="text-xs text-left bg-primary-50 border border-primary-100 rounded-xl p-3 overflow-x-auto text-accent-red mb-4">
                            {this.state.error.message}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary-900 text-white hover:shadow-modern transition-all"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

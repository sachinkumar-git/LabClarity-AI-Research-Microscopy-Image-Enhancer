/** Contains rendering errors to the current page instead of blanking the whole app. */
import { Component } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // Navigating away clears the error so other pages keep working.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center" role="alert">
        <TriangleAlert className="mx-auto size-8 text-amber-400" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold text-white">This page hit an unexpected error</h1>
        <p className="mt-2 text-sm text-slate-400">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-500 active:scale-[0.97]"
        >
          <RotateCcw className="size-4" aria-hidden /> Try again
        </button>
      </main>
    );
  }
}

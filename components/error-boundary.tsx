"use client";

import type { ReactNode } from "react";
import { Component } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
  stack?: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
      stack: error.stack,
    };
  }

  componentDidCatch(error: Error) {
    console.error("dashboard_error_boundary", error);
  }

  private async copyDiagnostics() {
    const diagnostics = [
      "voice-to-action-agent runtime fallback",
      `message: ${this.state.message}`,
      `path: ${typeof window !== "undefined" ? window.location.pathname : "unknown"}`,
      `time: ${new Date().toISOString()}`,
      this.state.stack ? `stack: ${this.state.stack}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(diagnostics);
    } catch {
      // Fallback still shows diagnostics inline.
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto mt-6 max-w-5xl rounded-3xl border border-rose-300 bg-rose-50 p-6 text-slate-900 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
          Runtime Fallback
        </p>
        <h1 className="mt-2 text-2xl font-semibold">The dashboard hit a runtime error.</h1>
        <p className="mt-2 text-sm text-slate-700">
          A safe fallback is active. Use diagnostics below and verify service health before retry.
        </p>
        <p className="mt-4 rounded-lg bg-white/80 p-3 text-sm font-medium text-rose-700">
          {this.state.message || "Unknown runtime error."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => this.copyDiagnostics()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Copy diagnostics
          </button>
          <a
            href="/api/health"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Open /api/health
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

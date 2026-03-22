import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", background: "var(--gh-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          background: "var(--gh-surface)", border: "1px solid var(--gh-border2)",
          borderRadius: "20px", padding: "40px 32px", maxWidth: "480px",
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: "48px",
            color: "var(--gh-pink)", marginBottom: "16px",
          }}>!</div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "22px",
            fontWeight: 700, color: "var(--gh-text)", marginBottom: "8px",
          }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "13px", color: "var(--gh-text2)", marginBottom: "24px" }}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "var(--gh-cyan)", color: "var(--gh-bg)",
              border: "none", borderRadius: "10px",
              padding: "10px 24px",
              fontFamily: "var(--font-display)", fontSize: "14px",
              fontWeight: 700, letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            RELOAD
          </button>
        </div>
      </div>
    );
  }
}

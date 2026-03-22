import { Spinner } from "./Spinner.tsx";

export function PageLoader() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--gh-bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <Spinner size={40} />
        <span style={{
          fontFamily: "var(--font-display)", fontSize: "13px",
          letterSpacing: "2px", color: "var(--gh-text3)",
        }}>
          LOADING...
        </span>
      </div>
    </div>
  );
}

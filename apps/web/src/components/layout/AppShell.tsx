import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.tsx";
import { Topbar } from "./Topbar.tsx";

export function AppShell() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div
        style={{
          marginLeft: "var(--sidebar-w)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <Topbar />
        <main
          className="page-enter"
          style={{ flex: 1, padding: "28px", overflowY: "auto" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

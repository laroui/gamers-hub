import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.tsx";
import { Topbar } from "./Topbar.tsx";
import { BottomNav } from "./BottomNav.tsx";
import { ToastContainer } from "../ui/Toast.tsx";
import { useIsMobile } from "../../hooks/useIsMobile.ts";

export function AppShell() {
  const isMobile = useIsMobile();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {!isMobile && <Sidebar />}
      <div
        style={{
          marginLeft: isMobile ? 0 : "var(--sidebar-w)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          paddingBottom: isMobile ? "64px" : 0,
        }}
      >
        <Topbar />
        <main className="page-enter" style={{ flex: 1, padding: isMobile ? "16px" : "28px", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
      {isMobile && <BottomNav />}
      <ToastContainer />
    </div>
  );
}

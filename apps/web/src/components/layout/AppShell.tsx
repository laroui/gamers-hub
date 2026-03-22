import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.tsx";
import { Topbar } from "./Topbar.tsx";
import { BottomNav } from "./BottomNav.tsx";
import { ToastContainer } from "../ui/Toast.tsx";
import { useIsMobile } from "../../hooks/useIsMobile.ts";

export function AppShell() {
  const isMobile = useIsMobile();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--gh-bg)" }}>
      {!isMobile && <Sidebar />}
      <div
        style={{
          marginLeft: isMobile ? 0 : "var(--sidebar-w)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: isMobile ? "100%" : `calc(100% - var(--sidebar-w))`,
          paddingBottom: isMobile ? "80px" : 0,
        }}
      >
        <Topbar />
        <main
          className="page-enter main-content"
          style={{
            flex: 1,
            padding: isMobile ? "16px" : "32px",
            width: "100%",
            maxWidth: "1600px",
            margin: "0 auto",
          }}
        >
          <Outlet />
        </main>
      </div>
      {isMobile && <BottomNav />}
      <ToastContainer />
    </div>
  );
}

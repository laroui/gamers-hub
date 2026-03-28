import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthProvider.tsx";
import { ToastContainer } from "../ui/Toast.tsx";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "/api/v1";
const GOOGLE_URL = `${API_BASE}/auth/google`;

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
      <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.6-4.9 7.3v6h7.9c4.6-4.3 7.3-10.6 7.3-17.5z" fill="#4285F4"/>
      <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.1-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z" fill="#34A853"/>
      <path d="M10.9 28.8c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.4v-6.2H2.7C1 17.4 0 20.6 0 24s1 6.6 2.7 9.1l8.2-4.3z" fill="#FBBC05"/>
      <path d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.9 2.4 30.5 0 24 0 14.8 0 6.7 5.2 2.7 12.9l8.2 6.2C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335"/>
    </svg>
  );
}

function UserMenu({ user, logout }: { user: { username: string; email: string; avatarUrl: string | null }; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: open ? "rgba(255,255,255,0.06)" : "none",
          border: "1px solid",
          borderColor: open ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.1)",
          borderRadius: "10px",
          padding: "5px 10px 5px 5px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%",
          background: "linear-gradient(135deg, #7b61ff, #ff4081)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 700,
          color: "#fff", overflow: "hidden", flexShrink: 0,
        }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials}
        </div>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "#e8eaf0", fontFamily: "var(--font-body)" }}>
          {user.username}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ color: "#4a5468", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "rgba(18,22,34,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px", padding: "6px",
          minWidth: "180px", zIndex: 200,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "4px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>{user.username}</div>
            <div style={{ fontSize: "11px", color: "#4a5468", marginTop: "2px" }}>{user.email}</div>
          </div>
          {[
            { label: "My Library", path: "/library" },
            { label: "Profile", path: "/profile" },
          ].map(({ label, path }) => (
            <button key={path}
              onClick={() => { setOpen(false); navigate(path); }}
              style={{
                width: "100%", textAlign: "left", background: "none",
                border: "none", borderRadius: "8px", padding: "8px 12px",
                color: "#9aa3b4", fontFamily: "var(--font-body)", fontSize: "13px",
                cursor: "pointer", display: "block",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#e8eaf0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "#9aa3b4"; }}
            >
              {label}
            </button>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "4px", paddingTop: "4px" }}>
            <button
              onClick={() => { setOpen(false); void logout(); }}
              style={{
                width: "100%", textAlign: "left", background: "none",
                border: "none", borderRadius: "8px", padding: "8px 12px",
                color: "#ff4081", fontFamily: "var(--font-body)", fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SignInMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          background: "#00e5ff", color: "#080b12",
          border: "none", borderRadius: "10px",
          padding: "8px 18px",
          fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700,
          letterSpacing: "0.5px", cursor: "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
      >
        SIGN IN
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          background: "rgba(12,15,24,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px", padding: "16px",
          width: "260px", zIndex: 200,
          boxShadow: "0 16px 50px rgba(0,0,0,0.6)",
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5468", fontFamily: "var(--font-display)", marginBottom: "12px" }}>
            SIGN IN TO GAMERS HUB
          </div>

          <a href={GOOGLE_URL} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            width: "100%", background: "#fff", border: "none", borderRadius: "10px",
            padding: "11px", color: "#1a1a1a",
            fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 600,
            textDecoration: "none", cursor: "pointer",
            transition: "opacity 0.15s", boxSizing: "border-box",
          }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
          >
            <GoogleIcon /> Continue with Google
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: "10px", color: "#4a5468", letterSpacing: "1px" }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Link to="/login" onClick={() => setOpen(false)} style={{
              flex: 1, textAlign: "center", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
              padding: "9px", color: "#9aa3b4",
              fontFamily: "var(--font-body)", fontSize: "13px", textDecoration: "none",
              transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.color = "#e8eaf0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "#9aa3b4"; }}
            >
              Sign in
            </Link>
            <Link to="/register" onClick={() => setOpen(false)} style={{
              flex: 1, textAlign: "center", background: "rgba(0,229,255,0.08)",
              border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px",
              padding: "9px", color: "#00e5ff",
              fontFamily: "var(--font-body)", fontSize: "13px", textDecoration: "none",
              transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.08)"; }}
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "Community", path: "/#community" },
];

export function PublicShell() {
  const { user, logout, isLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#080b12" }}>
      {/* Top navigation */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "60px",
        background: scrolled ? "rgba(8,11,18,0.95)" : "rgba(8,11,18,0.7)",
        borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,0.08)" : "transparent"}`,
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center",
        padding: "0 32px", gap: "32px",
        transition: "all 0.3s",
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 900,
            letterSpacing: "4px", color: "#00e5ff",
            textShadow: "0 0 20px rgba(0,229,255,0.5)",
          }}>GH</div>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", gap: "4px", flex: 1 }}>
          {NAV_LINKS.map(({ label, path }) => (
            <Link key={label} to={path} style={{
              padding: "6px 14px", borderRadius: "8px",
              fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500,
              color: "#9aa3b4", textDecoration: "none",
              transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#e8eaf0"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#9aa3b4"; (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: auth */}
        {!isLoading && (
          user
            ? <UserMenu user={user} logout={logout} />
            : <SignInMenu />
        )}
      </header>

      {/* Page content */}
      <div style={{ paddingTop: "60px" }}>
        <Outlet />
      </div>

      <ToastContainer />
    </div>
  );
}

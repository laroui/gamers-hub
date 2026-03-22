import { NavLink } from "react-router-dom";
import { LibraryIcon, PlatformsIcon, StatsIcon, ProfileIcon } from "../ui/Icons.tsx";

const NAV_ITEMS = [
  { to: "/library",   icon: <LibraryIcon size={22} />,   label: "Library" },
  { to: "/platforms", icon: <PlatformsIcon size={22} />, label: "Platforms" },
  { to: "/stats",     icon: <StatsIcon size={22} />,     label: "Stats" },
  { to: "/profile",   icon: <ProfileIcon size={22} />,   label: "Profile" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: "64px",
      background: "var(--gh-bg2)",
      borderTop: "1px solid var(--gh-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          title={item.label}
          style={({ isActive }) => ({
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            width: "44px", height: "44px",
            borderRadius: "12px",
            color: isActive ? "var(--gh-cyan)" : "var(--gh-text3)",
            transition: "color 0.2s",
          })}
        >
          {item.icon}
        </NavLink>
      ))}
    </nav>
  );
}

import { AvatarCard } from "../components/profile/AvatarCard.tsx";
import { ProfileStats } from "../components/profile/ProfileStats.tsx";
import { ProfilePlatforms } from "../components/profile/ProfilePlatforms.tsx";
import { ChangePassword } from "../components/profile/ChangePassword.tsx";
import { ShareProfile } from "../components/profile/ShareProfile.tsx";
import { DangerZone } from "../components/profile/DangerZone.tsx";

export function ProfilePage() {
  return (
    <div className="page-enter" style={{ padding: "28px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Page header */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "2px",
          color: "var(--gh-text)",
          marginBottom: "28px",
          textTransform: "uppercase",
        }}
      >
        PROFILE
      </h1>

      {/* Two-column layout */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Left column — 360px */}
        <div
          style={{
            width: "360px",
            minWidth: "280px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <AvatarCard />
          <ChangePassword />
          <DangerZone />
        </div>

        {/* Right column — flex 1 */}
        <div
          style={{
            flex: 1,
            minWidth: "280px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <ProfileStats />
          <ProfilePlatforms />
          <ShareProfile />
        </div>
      </div>
    </div>
  );
}

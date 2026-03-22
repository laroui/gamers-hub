import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../lib/auth/AuthProvider.tsx";
import { useUpdateProfile, useUploadAvatar } from "../../hooks/useProfile.ts";
import { useToast } from "../../stores/toast.ts";
import { Spinner } from "../ui/Spinner.tsx";

export function AvatarCard() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameValue, setUsernameValue] = useState(user?.username ?? "");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "GH";
  const avatarSrc = previewUrl ?? user?.avatarUrl ?? null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toastError("Image must be under 2MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    uploadAvatar.mutate(file, {
      onSuccess: () => {
        toastSuccess("Avatar updated");
        setPreviewUrl(null);
      },
      onError: () => {
        toastError("Failed to upload avatar");
        setPreviewUrl(null);
      },
    });
  };

  const handleUsernameSave = () => {
    const trimmed = usernameValue.trim();
    if (trimmed === user?.username) {
      setEditingUsername(false);
      return;
    }
    setUsernameError(null);
    updateProfile.mutate(
      { username: trimmed },
      {
        onSuccess: () => {
          setEditingUsername(false);
          toastSuccess("Username updated");
        },
        onError: (err: unknown) => {
          const anyErr = err as { response?: { data?: { error?: string } } };
          if (anyErr?.response?.data?.error === "UsernameTaken") {
            setUsernameError("Username already taken");
          } else {
            setUsernameError("Failed to update username");
          }
        },
      },
    );
  };

  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleUsernameSave();
    if (e.key === "Escape") {
      setEditingUsername(false);
      setUsernameValue(user?.username ?? "");
      setUsernameError(null);
    }
  };

  const memberSince = user?.createdAt
    ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })
    : null;

  return (
    <div className="gh-card" style={{ padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      {/* Avatar */}
      <div
        style={{ position: "relative", cursor: "pointer" }}
        onMouseEnter={() => setAvatarHover(true)}
        onMouseLeave={() => setAvatarHover(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            overflow: "hidden",
            background: "linear-gradient(135deg, var(--gh-purple), var(--gh-pink))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            flexShrink: 0,
            border: "2px solid var(--gh-border2)",
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user?.username ?? "avatar"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>

        {/* Camera overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: avatarHover ? 1 : 0,
            transition: "opacity 0.2s ease",
            pointerEvents: "none",
          }}
        >
          {uploadAvatar.isPending ? (
            <Spinner size={20} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Username */}
      <div style={{ width: "100%", textAlign: "center" }}>
        {editingUsername ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <input
              autoFocus
              value={usernameValue}
              onChange={(e) => setUsernameValue(e.target.value)}
              onBlur={handleUsernameSave}
              onKeyDown={handleUsernameKeyDown}
              style={{
                background: "var(--gh-surface2)",
                border: `1px solid ${usernameError ? "var(--gh-pink)" : "var(--gh-border2)"}`,
                borderRadius: "8px",
                padding: "6px 12px",
                color: "var(--gh-text)",
                fontFamily: "var(--font-display)",
                fontSize: "18px",
                textAlign: "center",
                outline: "none",
                width: "180px",
              }}
            />
            {usernameError && (
              <span style={{ color: "var(--gh-pink)", fontSize: "12px" }}>{usernameError}</span>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--gh-text)",
                letterSpacing: "0.5px",
              }}
            >
              {user?.username}
            </span>
            <button
              onClick={() => {
                setUsernameValue(user?.username ?? "");
                setEditingUsername(true);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--gh-text3)",
                fontSize: "14px",
                padding: "2px 4px",
                lineHeight: 1,
              }}
              title="Edit username"
            >
              ✎
            </button>
          </div>
        )}

        <div style={{ color: "var(--gh-text2)", fontSize: "13px", marginTop: "4px" }}>
          {user?.email}
        </div>

        {memberSince && (
          <div style={{ color: "var(--gh-text3)", fontSize: "12px", marginTop: "4px" }}>
            Member {memberSince}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider.tsx";
import { useToast } from "../../stores/toast.ts";
import { api } from "../../lib/api/client.ts";
import type { UserGame } from "@gamers-hub/types";
import type { PaginatedResponse } from "@gamers-hub/types";
import { Spinner } from "../ui/Spinner.tsx";

export function DangerZone() {
  const { user, logout } = useAuth();
  const toast = useToast();

  const [exportLoading, setExportLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<UserGame>>("/library", {
        params: { limit: 1000 },
      });
      const json = JSON.stringify({ exportedAt: new Date().toISOString(), library: data.data }, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gamers-hub-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Library exported");
    } catch {
      toast.error("Failed to export library");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmValue !== user?.username) return;
    setDeleteModalOpen(false);
    setDeleteConfirmValue("");
    toast.info("Account deletion — contact support to complete");
  };

  return (
    <>
      <div
        className="gh-card"
        style={{ padding: "20px", borderColor: "rgba(255,64,129,0.3)" }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "1px",
            color: "var(--gh-pink)",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          Danger Zone
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Export data */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ color: "var(--gh-text)", fontSize: "13px", fontWeight: 500 }}>
                Export Library Data
              </div>
              <div style={{ color: "var(--gh-text3)", fontSize: "12px", marginTop: "2px" }}>
                Download your full library as JSON
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "1px solid var(--gh-cyan)",
                borderRadius: "8px",
                padding: "7px 14px",
                color: "var(--gh-cyan)",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                cursor: exportLoading ? "not-allowed" : "pointer",
                opacity: exportLoading ? 0.7 : 1,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {exportLoading && <Spinner size={12} />}
              Export
            </button>
          </div>

          <div style={{ borderTop: "1px solid var(--gh-border)", margin: "4px 0" }} />

          {/* Delete account */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <div style={{ color: "var(--gh-text)", fontSize: "13px", fontWeight: 500 }}>
                Delete Account
              </div>
              <div style={{ color: "var(--gh-text3)", fontSize: "12px", marginTop: "2px" }}>
                Permanently remove your account and data
              </div>
            </div>
            <button
              onClick={() => setDeleteModalOpen(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--gh-pink)",
                borderRadius: "8px",
                padding: "7px 14px",
                color: "var(--gh-pink)",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteModalOpen(false);
              setDeleteConfirmValue("");
            }
          }}
        >
          <div
            className="gh-card"
            style={{ padding: "28px", maxWidth: "380px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "18px",
                color: "var(--gh-pink)",
                marginBottom: "12px",
              }}
            >
              Delete Account
            </h3>
            <p style={{ color: "var(--gh-text2)", fontSize: "13px", lineHeight: 1.6, marginBottom: "16px" }}>
              This action cannot be undone. Type your username{" "}
              <strong style={{ color: "var(--gh-text)" }}>{user?.username}</strong>{" "}
              to confirm.
            </p>
            <input
              autoFocus
              value={deleteConfirmValue}
              onChange={(e) => setDeleteConfirmValue(e.target.value)}
              placeholder={user?.username ?? ""}
              style={{
                width: "100%",
                background: "var(--gh-surface2)",
                border: "1px solid var(--gh-border2)",
                borderRadius: "8px",
                padding: "9px 12px",
                color: "var(--gh-text)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                outline: "none",
                marginBottom: "16px",
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setDeleteModalOpen(false); setDeleteConfirmValue(""); }}
                style={{
                  background: "none",
                  border: "1px solid var(--gh-border2)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "var(--gh-text2)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmValue !== user?.username}
                style={{
                  background: deleteConfirmValue === user?.username ? "var(--gh-pink-dim)" : "transparent",
                  border: "1px solid var(--gh-pink)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "var(--gh-pink)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  cursor: deleteConfirmValue !== user?.username ? "not-allowed" : "pointer",
                  opacity: deleteConfirmValue !== user?.username ? 0.5 : 1,
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

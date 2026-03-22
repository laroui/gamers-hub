import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Notification, NotificationType } from "@gamers-hub/types";
import { useNotifications, useMarkAllRead, useDismissNotification } from "../../hooks/useNotifications.ts";

// ── Type metadata ─────────────────────────────────────────────

interface TypeMeta {
  icon: string;
  color: string;
  bg: string;
}

const TYPE_META: Record<NotificationType, TypeMeta> = {
  sync_complete: {
    icon: "✓",
    color: "var(--gh-green)",
    bg: "var(--gh-green-dim)",
  },
  sync_error: {
    icon: "✕",
    color: "var(--gh-pink)",
    bg: "var(--gh-pink-dim)",
  },
  achievement_unlocked: {
    icon: "★",
    color: "var(--gh-orange)",
    bg: "var(--gh-orange-dim)",
  },
  platform_connected: {
    icon: "⬡",
    color: "var(--gh-cyan)",
    bg: "var(--gh-cyan-dim)",
  },
};

const DEFAULT_META: TypeMeta = {
  icon: "●",
  color: "var(--gh-text2)",
  bg: "var(--gh-surface3)",
};

// ── Notification Item ─────────────────────────────────────────

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) {
  const meta = TYPE_META[notification.type] ?? DEFAULT_META;

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px 16px",
        borderBottom: "1px solid var(--gh-border)",
        position: "relative",
        background: notification.isRead ? "transparent" : "rgba(0,229,255,0.03)",
        transition: "background 0.2s",
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: meta.bg,
          color: meta.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          flexShrink: 0,
        }}
      >
        {meta.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--gh-text)",
            marginBottom: "2px",
            lineHeight: 1.3,
          }}
        >
          {notification.title}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--gh-text2)",
            lineHeight: 1.4,
            marginBottom: "4px",
          }}
        >
          {notification.body}
        </div>
        <div style={{ fontSize: "11px", color: "var(--gh-text3)" }}>
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </div>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div
          style={{
            position: "absolute",
            top: "14px",
            right: "40px",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--gh-cyan)",
            flexShrink: 0,
          }}
        />
      )}

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(notification.id)}
        style={{
          background: "none",
          border: "none",
          color: "var(--gh-text3)",
          cursor: "pointer",
          padding: "2px",
          fontSize: "14px",
          lineHeight: 1,
          flexShrink: 0,
          alignSelf: "flex-start",
          marginTop: "2px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--gh-pink)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--gh-text3)";
        }}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonItem() {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px 16px",
        borderBottom: "1px solid var(--gh-border)",
      }}
    >
      <div
        className="skeleton"
        style={{ width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0 }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div className="skeleton" style={{ height: "13px", borderRadius: "4px", width: "60%" }} />
        <div className="skeleton" style={{ height: "12px", borderRadius: "4px", width: "85%" }} />
        <div className="skeleton" style={{ height: "11px", borderRadius: "4px", width: "40%" }} />
      </div>
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const dismiss = useDismissNotification();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-mark-all-read 1.5s after opening
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      markAllRead.mutate();
    }, 1500);
    return () => clearTimeout(timer);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside detection (delayed 100ms to avoid immediate close)
  useEffect(() => {
    if (!isOpen) return;

    let active = false;
    const delay = setTimeout(() => {
      active = true;
    }, 100);

    const handler = (e: MouseEvent) => {
      if (!active) return;
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => {
      clearTimeout(delay);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, onClose]);

  const notifications = data?.data ?? [];

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        top: "60px",
        right: 0,
        width: "360px",
        height: "calc(100vh - 60px)",
        background: "var(--gh-surface2)",
        borderLeft: "1px solid var(--gh-border2)",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isOpen ? "-8px 0 32px rgba(0,0,0,0.4)" : "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          height: "52px",
          borderBottom: "1px solid var(--gh-border)",
          flexShrink: 0,
          gap: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "1.5px",
            color: "var(--gh-text)",
            flex: 1,
          }}
        >
          NOTIFICATIONS
        </span>
        {notifications.length > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            style={{
              background: "none",
              border: "none",
              color: "var(--gh-cyan)",
              fontSize: "12px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              fontFamily: "var(--font-body)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--gh-cyan-dim)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
            }}
          >
            Mark all read
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--gh-text3)",
            fontSize: "18px",
            cursor: "pointer",
            padding: "4px",
            lineHeight: 1,
            borderRadius: "6px",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--gh-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--gh-text3)";
          }}
          aria-label="Close notifications"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        {isLoading ? (
          <>
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
          </>
        ) : notifications.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "12px",
              color: "var(--gh-text3)",
            }}
          >
            <span style={{ fontSize: "36px" }}>🔔</span>
            <span style={{ fontSize: "14px" }}>No notifications yet</span>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--gh-border)",
            fontSize: "11px",
            color: "var(--gh-text3)",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          Showing last {notifications.length} notification{notifications.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

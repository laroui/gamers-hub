import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth/AuthProvider.tsx";
import { usePosts, usePostComments, useCreatePost, useToggleLike, useAddComment, useDeleteComment } from "../hooks/usePosts.ts";
import type { Post, PostComment } from "@gamers-hub/types";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TAG_COLORS: Record<string, string> = {
  gaming: "#00e5ff", news: "#7b61ff", discussion: "#ff9800",
  achievement: "#4caf50", review: "#e91e63", help: "#ff5722",
};
function tagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] ?? "#4a5468";
}

// ─────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────

function Avatar({ url, username, size = 32 }: { url: string | null; username: string; size?: number }) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #7b61ff, #ff4081)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", fontSize: size * 0.38, fontWeight: 700,
      color: "#fff", overflow: "hidden",
    }}>
      {url
        ? <img src={url} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Post Detail Modal
// ─────────────────────────────────────────────────────────────

function CommentItem({ comment, userId, onDelete }: { comment: PostComment; userId?: string | undefined; onDelete: (id: string) => void }) {
  return (
    <div style={{ display: "flex", gap: "10px", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <Avatar url={comment.author.avatarUrl} username={comment.author.username} size={30} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>{comment.author.username}</span>
          <span style={{ fontSize: "11px", color: "#4a5468" }}>{timeAgo(comment.createdAt)}</span>
          {userId === comment.author.id && (
            <button
              onClick={() => onDelete(comment.id)}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "#4a5468", fontSize: "11px", cursor: "pointer", padding: "2px 6px" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff4081")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#4a5468")}
            >
              delete
            </button>
          )}
        </div>
        <p style={{ fontSize: "13px", color: "#9aa3b4", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{comment.body}</p>
      </div>
    </div>
  );
}

function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const { user } = useAuth();
  const { data: commentsData, refetch: refetchComments } = usePostComments(post.id);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const toggleLike = useToggleLike();
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const handleLike = async () => {
    if (!user) return;
    setLiked((p) => !p);
    setLikeCount((p) => liked ? p - 1 : p + 1);
    await toggleLike.mutateAsync(post.id);
  };

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;
    await addComment.mutateAsync({ postId: post.id, body: commentText.trim() });
    setCommentText("");
    void refetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment.mutateAsync({ postId: post.id, commentId });
    void refetchComments();
  };

  const comments: PostComment[] = commentsData?.data ?? [];

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(4,6,10,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        width: "100%", maxWidth: "720px",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <Avatar url={post.author.avatarUrl} username={post.author.username} size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
              <span style={{ fontWeight: 600, color: "#e8eaf0", fontSize: "14px" }}>{post.author.username}</span>
              <span style={{ fontSize: "12px", color: "#4a5468" }}>{timeAgo(post.createdAt)}</span>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {post.tags.map((tag) => (
                <span key={tag} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: `${tagColor(tag)}18`, color: tagColor(tag), fontWeight: 600, letterSpacing: "0.5px" }}>
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a5468", cursor: "pointer", padding: "4px", fontSize: "20px", lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {post.coverUrl && (
            <img src={post.coverUrl} alt={post.title} style={{ width: "100%", borderRadius: "12px", marginBottom: "16px", maxHeight: "260px", objectFit: "cover" }} />
          )}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "#e8eaf0", margin: "0 0 12px" }}>{post.title}</h2>
          <p style={{ fontSize: "14px", color: "#9aa3b4", lineHeight: 1.7, margin: "0 0 20px", whiteSpace: "pre-wrap" }}>{post.body}</p>

          {/* Like bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={handleLike}
              disabled={!user}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: liked ? "rgba(255,64,129,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${liked ? "rgba(255,64,129,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "8px", padding: "6px 14px", cursor: user ? "pointer" : "default",
                color: liked ? "#ff4081" : "#4a5468",
                fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 500,
                transition: "all 0.2s",
              }}
            >
              <span>{liked ? "♥" : "♡"}</span>
              <span>{likeCount}</span>
            </button>
            <span style={{ fontSize: "13px", color: "#4a5468" }}>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Comments */}
          <div style={{ marginTop: "8px" }}>
            {comments.length === 0
              ? <p style={{ fontSize: "13px", color: "#4a5468", textAlign: "center", padding: "20px 0" }}>No comments yet. Be the first!</p>
              : comments.map((c) => (
                <CommentItem key={c.id} comment={c} userId={user?.id} onDelete={handleDeleteComment} />
              ))
            }
          </div>
        </div>

        {/* Comment input */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
          {user ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <Avatar url={user.avatarUrl} username={user.username} size={32} />
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleComment(); }}
                  placeholder="Write a comment… (⌘Enter to post)"
                  rows={2}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px", padding: "10px 12px",
                    color: "#e8eaf0", fontSize: "13px", fontFamily: "var(--font-body)",
                    resize: "none", outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                />
              </div>
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || addComment.isPending}
                style={{
                  background: commentText.trim() ? "#00e5ff" : "rgba(0,229,255,0.2)",
                  color: commentText.trim() ? "#080b12" : "#4a5468",
                  border: "none", borderRadius: "8px", padding: "8px 16px",
                  fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 700,
                  cursor: commentText.trim() ? "pointer" : "default",
                  transition: "all 0.2s", whiteSpace: "nowrap",
                }}
              >
                POST
              </button>
            </div>
          ) : (
            <p style={{ textAlign: "center", fontSize: "13px", color: "#4a5468", margin: 0 }}>
              <Link to="/login" style={{ color: "#00e5ff", textDecoration: "none" }}>Sign in</Link> to join the conversation
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Post Card
// ─────────────────────────────────────────────────────────────

function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const gradients = [
    "linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(123,97,255,0.1) 100%)",
    "linear-gradient(135deg, rgba(123,97,255,0.15) 0%, rgba(255,64,129,0.1) 100%)",
    "linear-gradient(135deg, rgba(255,152,0,0.12) 0%, rgba(255,64,129,0.08) 100%)",
    "linear-gradient(135deg, rgba(76,175,80,0.12) 0%, rgba(0,229,255,0.08) 100%)",
  ];
  const grad = gradients[post.id.charCodeAt(0) % gradients.length];

  return (
    <article
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px", overflow: "hidden",
        cursor: "pointer", transition: "all 0.2s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,255,0.2)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.transform = "none";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Cover */}
      <div style={{
        height: "130px",
        background: post.coverUrl ? undefined : grad,
        position: "relative", flexShrink: 0,
      }}>
        {post.coverUrl && (
          <img src={post.coverUrl} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {post.pinned && (
          <div style={{
            position: "absolute", top: "10px", left: "10px",
            background: "rgba(255,152,0,0.9)", color: "#fff",
            fontSize: "9px", fontWeight: 700, letterSpacing: "1px",
            padding: "3px 8px", borderRadius: "4px", fontFamily: "var(--font-display)",
          }}>
            PINNED
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4))" }} />
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Tags */}
        {post.tags.length > 0 && (
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{
                fontSize: "9px", padding: "2px 7px", borderRadius: "4px",
                background: `${tagColor(tag)}18`, color: tagColor(tag),
                fontWeight: 700, letterSpacing: "0.5px", fontFamily: "var(--font-display)",
              }}>
                {tag.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700,
          color: "#e8eaf0", margin: 0, lineHeight: 1.3,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {post.title}
        </h3>

        {/* Body preview */}
        <p style={{
          fontSize: "12px", color: "#4a5468", margin: 0, lineHeight: 1.5, flex: 1,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {post.body}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
          <Avatar url={post.author.avatarUrl} username={post.author.username} size={20} />
          <span style={{ fontSize: "11px", color: "#4a5468", flex: 1 }}>{post.author.username}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: post.likedByMe ? "#ff4081" : "#4a5468", display: "flex", alignItems: "center", gap: "3px" }}>
              {post.likedByMe ? "♥" : "♡"} {post.likeCount}
            </span>
            <span style={{ fontSize: "11px", color: "#4a5468", display: "flex", alignItems: "center", gap: "3px" }}>
              💬 {post.commentCount}
            </span>
            <span style={{ fontSize: "11px", color: "#2a3040" }}>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Post Modal
// ─────────────────────────────────────────────────────────────

function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createPost = useCreatePost();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) { setError("Title and body are required."); return; }
    setError(null);
    try {
      await createPost.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        coverUrl: coverUrl.trim() || null,
        tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10),
      });
      onCreated();
      onClose();
    } catch {
      setError("Failed to create post. Please try again.");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px",
    padding: "10px 14px", color: "#e8eaf0", fontSize: "14px",
    fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(4,6,10,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
      }}
    >
      <div style={{
        background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px", width: "100%", maxWidth: "600px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
      }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "#e8eaf0", margin: 0, flex: 1 }}>
            NEW POST
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a5468", cursor: "pointer", fontSize: "20px" }}>×</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "11px", letterSpacing: "1px", color: "#4a5468", display: "block", marginBottom: "6px" }}>TITLE *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's on your mind?" style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} />
          </div>
          <div>
            <label style={{ fontSize: "11px", letterSpacing: "1px", color: "#4a5468", display: "block", marginBottom: "6px" }}>BODY *</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your gaming journey, news, or thoughts…" rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", letterSpacing: "1px", color: "#4a5468", display: "block", marginBottom: "6px" }}>TAGS</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="gaming, news, review…" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", letterSpacing: "1px", color: "#4a5468", display: "block", marginBottom: "6px" }}>COVER IMAGE URL</label>
              <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")} />
            </div>
          </div>

          {error && <p style={{ fontSize: "13px", color: "#ff4081", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
            <button onClick={onClose} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
              padding: "10px 20px", color: "#9aa3b4", fontFamily: "var(--font-body)", fontSize: "13px", cursor: "pointer",
            }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={createPost.isPending || !title.trim() || !body.trim()} style={{
              background: (!title.trim() || !body.trim()) ? "rgba(0,229,255,0.3)" : "#00e5ff",
              color: "#080b12", border: "none", borderRadius: "8px",
              padding: "10px 24px",
              fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.5px",
              cursor: (!title.trim() || !body.trim()) ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}>
              {createPost.isPending ? "POSTING…" : "PUBLISH"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────────

function HeroSection() {
  const { user, isAuthenticated } = useAuth();

  return (
    <section style={{
      position: "relative", minHeight: "520px",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "80px 32px 60px", overflow: "hidden",
    }}>
      {/* Background glows */}
      <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "800px", height: "600px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,229,255,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: "500px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(123,97,255,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "10%", right: "5%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,64,129,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ textAlign: "center", maxWidth: "700px", position: "relative" }}>
        {/* Eyebrow */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)",
          borderRadius: "100px", padding: "6px 16px", marginBottom: "28px",
        }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }} />
          <span style={{ fontSize: "11px", letterSpacing: "2px", color: "#00e5ff", fontFamily: "var(--font-display)", fontWeight: 700 }}>
            THE GAMING HUB
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: "clamp(40px, 7vw, 72px)",
          fontWeight: 900, letterSpacing: "4px",
          color: "#e8eaf0",
          textShadow: "0 0 60px rgba(0,229,255,0.15)",
          margin: "0 0 20px", lineHeight: 1.05,
        }}>
          TRACK. SHARE.
          <br />
          <span style={{ color: "#00e5ff", textShadow: "0 0 40px rgba(0,229,255,0.5)" }}>LEVEL UP.</span>
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#4a5468", lineHeight: 1.6, margin: "0 0 36px", maxWidth: "520px", marginLeft: "auto", marginRight: "auto" }}>
          Your gaming life, unified. Connect your platforms, track every game,
          and share your journey with a community that gets it.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          {isAuthenticated ? (
            <Link to="/library" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "#00e5ff", color: "#080b12",
              borderRadius: "12px", padding: "14px 28px",
              fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700,
              textDecoration: "none", letterSpacing: "1px", transition: "all 0.2s",
            }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              GO TO MY LIBRARY →
            </Link>
          ) : (
            <>
              <Link to="/register" style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "#00e5ff", color: "#080b12",
                borderRadius: "12px", padding: "14px 28px",
                fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700,
                textDecoration: "none", letterSpacing: "1px", transition: "all 0.2s",
              }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              >
                GET STARTED FREE
              </Link>
              <a href="#community" style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px", padding: "14px 28px",
                fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 500,
                color: "#9aa3b4", textDecoration: "none", transition: "all 0.2s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.color = "#e8eaf0"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "#9aa3b4"; }}
              >
                Browse Community
              </a>
            </>
          )}
        </div>

        {/* Stats strip */}
        {!isAuthenticated && (
          <div style={{ display: "flex", gap: "32px", justifyContent: "center", marginTop: "48px" }}>
            {[
              { value: "10K+", label: "Gamers" },
              { value: "500K+", label: "Games Tracked" },
              { value: "50+", label: "Platforms" },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 800, color: "#e8eaf0" }}>{value}</div>
                <div style={{ fontSize: "11px", color: "#4a5468", letterSpacing: "1px" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Welcome back card for logged-in users */}
        {isAuthenticated && user && (
          <div style={{
            marginTop: "32px",
            background: "rgba(0,229,255,0.05)",
            border: "1px solid rgba(0,229,255,0.15)",
            borderRadius: "14px", padding: "16px 24px",
            display: "inline-flex", alignItems: "center", gap: "12px",
          }}>
            <Avatar url={user.avatarUrl} username={user.username} size={36} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "13px", color: "#4a5468" }}>Welcome back,</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#e8eaf0" }}>{user.username}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Community Feed Section
// ─────────────────────────────────────────────────────────────

function CommunitySection() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = usePosts();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const postsData: Post[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <section id="community" style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 32px 80px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#4a5468", fontFamily: "var(--font-display)", marginBottom: "4px" }}>
            LATEST FROM THE HUB
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "#e8eaf0", margin: 0, letterSpacing: "1px" }}>
            COMMUNITY
          </h2>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: "10px", padding: "10px 18px",
              color: "#00e5ff", fontFamily: "var(--font-display)",
              fontSize: "13px", fontWeight: 700, letterSpacing: "0.5px",
              cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.14)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.08)"; }}
          >
            + NEW POST
          </button>
        )}
      </div>

      {/* Divider line */}
      <div style={{ height: "1px", background: "linear-gradient(to right, rgba(0,229,255,0.3), rgba(123,97,255,0.2), transparent)", marginBottom: "32px" }} />

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              height: "280px", borderRadius: "16px",
              background: "rgba(255,255,255,0.02)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && postsData.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎮</div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "#e8eaf0", marginBottom: "8px" }}>
            No posts yet
          </h3>
          <p style={{ fontSize: "14px", color: "#4a5468", marginBottom: "24px" }}>
            Be the first to share something with the community!
          </p>
          {user
            ? <button onClick={() => setShowCreate(true)} style={{
              background: "#00e5ff", color: "#080b12", border: "none",
              borderRadius: "10px", padding: "12px 24px",
              fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700,
              cursor: "pointer",
            }}>CREATE FIRST POST</button>
            : <Link to="/register" style={{
              background: "#00e5ff", color: "#080b12", textDecoration: "none",
              borderRadius: "10px", padding: "12px 24px",
              fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700,
              display: "inline-block",
            }}>JOIN THE COMMUNITY</Link>
          }
        </div>
      )}

      {/* Posts grid */}
      {!isLoading && postsData.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "20px",
        }}>
          {postsData.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
      {showCreate && (
        <CreatePostModal onClose={() => setShowCreate(false)} onCreated={() => void refetch()} />
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <div>
      <HeroSection />

      {/* Separator */}
      <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)", margin: "0 32px" }} />

      <CommunitySection />
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/home/BottomNav";
import { useNavigate } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  visibility: string;
  completion_percentage: number;
  weekly_task_completion_rate: number;
  consistency_rating: number;
  momentum_score: number;
  created_at: string;
  // Joined
  author_display_name?: string | null;
  like_count?: number;
  comment_count?: number;
  encourage_count?: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Community() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "User";
  void displayName;

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState<string>("public");
  const [posting, setPosting] = useState(false);
  const [interactingPost, setInteractingPost] = useState<string | null>(null);

  /* ---- Fetch posts ---- */
  const fetchPosts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: postsData, error: postsErr } = await supabase
        .from("community_posts")
        .select("*")
        .in("visibility", ["public", "limited"])
        .order("created_at", { ascending: false })
        .limit(30);

      if (postsErr) {
        console.error("Failed to fetch posts:", postsErr);
        setLoading(false);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Get author display names
      const authorIds = [...new Set((postsData as any[]).map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("users")
        .select("id, display_name")
        .in("id", authorIds);

      const profileMap = new Map<string, string>();
      profiles?.forEach((p: any) => {
        profileMap.set(p.id, p.display_name ?? "Anonymous");
      });

      // Get interaction counts
      const postIds = (postsData as any[]).map((p) => p.id);
      const { data: interactions } = await supabase
        .from("community_interactions")
        .select("post_id, interaction_type")
        .in("post_id", postIds);

      const likeCounts = new Map<string, number>();
      const commentCounts = new Map<string, number>();
      const encourageCounts = new Map<string, number>();

      interactions?.forEach((i: any) => {
        if (i.interaction_type === "like") likeCounts.set(i.post_id, (likeCounts.get(i.post_id) ?? 0) + 1);
        if (i.interaction_type === "comment") commentCounts.set(i.post_id, (commentCounts.get(i.post_id) ?? 0) + 1);
        if (i.interaction_type === "encourage") encourageCounts.set(i.post_id, (encourageCounts.get(i.post_id) ?? 0) + 1);
      });

      setPosts(
        (postsData as any[]).map((p) => ({
          ...p,
          author_display_name: profileMap.get(p.user_id) ?? "Anonymous",
          like_count: likeCounts.get(p.id) ?? 0,
          comment_count: commentCounts.get(p.id) ?? 0,
          encourage_count: encourageCounts.get(p.id) ?? 0,
        }))
      );
    } catch (err) {
      console.error("Community fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ---- Create post ---- */
  const handleCreatePost = useCallback(async () => {
    if (!user?.id || !newPostContent.trim()) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        content: newPostContent.trim(),
        visibility: newPostVisibility,
        completion_percentage: 0,
        weekly_task_completion_rate: 0,
        consistency_rating: 0,
        momentum_score: 0,
      });

      if (error) {
        console.error("Failed to create post:", error);
        return;
      }

      setNewPostContent("");
      setNewPostVisibility("public");
      setShowCreate(false);
      await fetchPosts();
    } catch (err) {
      console.error("Create post error:", err);
    } finally {
      setPosting(false);
    }
  }, [user?.id, newPostContent, newPostVisibility, fetchPosts]);

  /* ---- Interact ---- */
  const handleInteract = useCallback(async (postId: string, type: "like" | "encourage") => {
    if (!user?.id) return;
    setInteractingPost(postId);
    try {
      const { error } = await supabase.from("community_interactions").insert({
        post_id: postId,
        user_id: user.id,
        interaction_type: type,
        content: null,
      });

      if (error && error.code !== "23505") {
        console.error("Interaction failed:", error);
      } else {
        // Optimistic update
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            if (type === "like") return { ...p, like_count: (p.like_count ?? 0) + 1 };
            if (type === "encourage") return { ...p, encourage_count: (p.encourage_count ?? 0) + 1 };
            return p;
          })
        );
      }
    } catch (err) {
      console.error("Interaction error:", err);
    } finally {
      setInteractingPost(null);
    }
  }, [user?.id]);

  /* ---- Format date ---- */
  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      background: "transparent",
      isolation: "isolate",
      maxWidth: 430,
      margin: "0 auto",
      minHeight: "100vh",
      padding: "2px 10px 90px",
    }}>
      {/* ── Header ── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "50%",
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#A8A8A8",
            }}
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#F5F5F5",
            letterSpacing: "-0.3px",
          }}>
            Community
          </h1>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: "var(--theme-accent, #9a0000)",
            border: "none",
            borderRadius: 999,
            padding: "8px 18px",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.02em",
            boxShadow: "0 4px 14px rgba(154,0,0,0.35)",
          }}
        >
          + Post
        </button>
      </header>

      {/* ── Create Post Modal ── */}
      {showCreate && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
        onClick={() => setShowCreate(false)}
        >
          <div
            style={{
              background: "rgba(26,29,39,0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 22,
              padding: "24px 20px",
              width: "100%",
              maxWidth: 390,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F5F5F5", marginBottom: 18 }}>
              Share with the Community
            </h2>

            <textarea
              placeholder="Share your progress, wins, or thoughts..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "12px 16px",
                color: "#F5F5F5",
                fontSize: 15,
                marginBottom: 14,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />

            {/* Visibility selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {["public", "limited"].map((v) => (
                <button
                  key={v}
                  onClick={() => setNewPostVisibility(v)}
                  style={{
                    background: newPostVisibility === v
                      ? "var(--glossy-pill-bg, rgba(154,0,0,0.15))"
                      : "rgba(255,255,255,0.04)",
                    border: newPostVisibility === v
                      ? "1px solid var(--glossy-pill-border, rgba(154,0,0,0.4))"
                      : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    padding: "6px 14px",
                    color: newPostVisibility === v ? "var(--theme-accent, #ff3b30)" : "#8A8A8F",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 999,
                  padding: "10px 22px",
                  color: "#A8A8A8",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={posting || !newPostContent.trim()}
                style={{
                  background: !newPostContent.trim() ? "rgba(154,0,0,0.4)" : "var(--theme-accent, #9a0000)",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 22px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: newPostContent.trim() ? "pointer" : "not-allowed",
                  boxShadow: "0 4px 14px rgba(154,0,0,0.3)",
                }}
              >
                {posting ? "Posting..." : "Share Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
          <div style={{
            width: 32,
            height: 32,
            border: "2px solid var(--theme-accent, #9a0000)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && posts.length === 0 && (
        <div style={{
          textAlign: "center",
          paddingTop: 60,
          color: "#7b7f88",
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14, opacity: 0.5 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No community posts yet</p>
          <p style={{ fontSize: 12, color: "#5b5f68" }}>Be the first to share your progress!</p>
        </div>
      )}

      {/* ── Post Feed ── */}
      {!loading && posts.map((post) => (
        <div
          key={post.id}
          style={{
            background: "rgba(26,29,39,0.5)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: "16px 18px",
            marginTop: 10,
          }}
        >
          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--theme-accent, rgba(154,0,0,0.6)), color-mix(in srgb, var(--theme-accent, #DC143C) 30%, transparent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#F5F5F5",
              flexShrink: 0,
            }}>
              {(post.author_display_name ?? "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F5F5F5" }}>
                {post.author_display_name ?? "Anonymous"}
              </span>
              <span style={{ fontSize: 11, color: "#6b6f78", marginLeft: 8 }}>
                {formatDate(post.created_at)}
              </span>
            </div>
          </div>

          {/* Content */}
          <p style={{
            fontSize: 14,
            color: "#C8C8CC",
            lineHeight: 1.6,
            margin: "0 0 12px 0",
            whiteSpace: "pre-wrap",
          }}>
            {post.content}
          </p>

          {/* Stats row */}
          <div style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}>
            <StatPill label="Momentum" value={`${post.momentum_score ?? 0}`} color="#ff9500" />
            <StatPill label="Consistency" value={`${post.consistency_rating ?? 0}`} color="#30c0ff" />
            <StatPill label="Completion" value={`${post.completion_percentage ?? 0}%`} color="#30d158" />
            <StatPill label="Weekly" value={`${post.weekly_task_completion_rate ?? 0}%`} color="#bf5af2" />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 14, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
            <button
              onClick={() => handleInteract(post.id, "like")}
              disabled={interactingPost === post.id}
              style={{
                background: "none",
                border: "none",
                color: "#A8A8A8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 6px",
                borderRadius: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              </svg>
              {post.like_count ?? 0}
            </button>
            <button
              onClick={() => handleInteract(post.id, "encourage")}
              disabled={interactingPost === post.id}
              style={{
                background: "none",
                border: "none",
                color: "#A8A8A8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 6px",
                borderRadius: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {post.encourage_count ?? 0} Encourage
            </button>
          </div>
        </div>
      ))}

      <BottomNav />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Stat Pill ── */
function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      color,
      background: `${color}12`,
      border: `1px solid ${color}30`,
      borderRadius: 999,
      padding: "3px 9px",
      letterSpacing: "0.03em",
    }}>
      {label}: {value}
    </span>
  );
}

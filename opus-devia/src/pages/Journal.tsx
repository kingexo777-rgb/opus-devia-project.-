import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/home/BottomNav";
import { useNavigate } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  is_locked: boolean;
  assistant_access: boolean;
  created_at: string;
  updated_at: string;
}

const HEADER_HEIGHT = 56;
void HEADER_HEIGHT;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Journal() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "User";
  void displayName;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newLocked, setNewLocked] = useState(false);
  const [newAssistantAccess, setNewAssistantAccess] = useState(false);

  /* ---- Fetch entries ---- */
  const fetchEntries = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Failed to fetch journal:", error);
      else setEntries((data as JournalEntry[]) ?? []);
    } catch (err) {
      console.error("Journal fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  /* ---- Create entry ---- */
  const handleCreate = useCallback(async () => {
    if (!user?.id || !newContent.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("journal_entries").insert({
        user_id: user.id,
        title: newTitle.trim() || null,
        content: newContent.trim(),
        is_locked: newLocked,
        assistant_access: newAssistantAccess && !newLocked,
      });

      if (error) {
        console.error("Failed to create entry:", error);
        return;
      }

      setNewTitle("");
      setNewContent("");
      setNewLocked(false);
      setNewAssistantAccess(false);
      setShowCreate(false);
      await fetchEntries();
    } catch (err) {
      console.error("Create entry error:", err);
    } finally {
      setSaving(false);
    }
  }, [user?.id, newTitle, newContent, newLocked, newAssistantAccess, fetchEntries]);

  /* ---- Delete entry ---- */
  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", id);

      if (error) console.error("Failed to delete:", error);
      else {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
    }
  }, [expandedId]);

  /* ---- Format date ---- */
  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            Journal
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
          + New Entry
        </button>
      </header>

      {/* ── Create Entry Modal ── */}
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
              maxHeight: "85vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F5F5F5", marginBottom: 18 }}>
              New Journal Entry
            </h2>

            {/* Title */}
            <input
              type="text"
              placeholder="Entry title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "12px 16px",
                color: "#F5F5F5",
                fontSize: 15,
                marginBottom: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* Content */}
            <textarea
              placeholder="What's on your mind..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={6}
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

            {/* Toggles */}
            <div style={{ display: "flex", gap: 20, marginBottom: 18 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#A8A8A8", fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newLocked}
                  onChange={(e) => {
                    setNewLocked(e.target.checked);
                    if (e.target.checked) setNewAssistantAccess(false);
                  }}
                  style={{ accentColor: "var(--theme-accent, #9a0000)" }}
                />
                Locked
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#A8A8A8", fontSize: 13, cursor: "pointer", opacity: newLocked ? 0.4 : 1 }}>
                <input
                  type="checkbox"
                  checked={newAssistantAccess}
                  onChange={(e) => setNewAssistantAccess(e.target.checked)}
                  disabled={newLocked}
                  style={{ accentColor: "var(--theme-accent, #9a0000)" }}
                />
                Mentor access
              </label>
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
                onClick={handleCreate}
                disabled={saving || !newContent.trim()}
                style={{
                  background: !newContent.trim() ? "rgba(154,0,0,0.4)" : "var(--theme-accent, #9a0000)",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 22px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: newContent.trim() ? "pointer" : "not-allowed",
                  boxShadow: "0 4px 14px rgba(154,0,0,0.3)",
                }}
              >
                {saving ? "Saving..." : "Save Entry"}
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
      {!loading && entries.length === 0 && (
        <div style={{
          textAlign: "center",
          paddingTop: 60,
          color: "#7b7f88",
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14, opacity: 0.5 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No journal entries yet</p>
          <p style={{ fontSize: 12, color: "#5b5f68" }}>Capture your thoughts, wins, and reflections</p>
        </div>
      )}

      {/* ── Entry List ── */}
      {!loading && entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const preview = entry.content.length > 120
          ? entry.content.slice(0, 120) + "..."
          : entry.content;

        return (
          <div
            key={entry.id}
            style={{
              background: "rgba(26,29,39,0.5)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: "16px 18px",
              marginTop: 10,
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
            }}
            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
          >
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                {entry.title ? (
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F5F5F5", margin: 0, marginBottom: 4 }}>
                    {entry.title}
                  </h3>
                ) : (
                  <span style={{ fontSize: 12, color: "#5b5f68", fontStyle: "italic" }}>Untitled</span>
                )}
                <span style={{ fontSize: 11, color: "#6b6f78" }}>{formatDate(entry.created_at)}</span>
              </div>

              {/* Badges */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {entry.is_locked && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#ff9500",
                    background: "rgba(255,149,0,0.12)",
                    border: "1px solid rgba(255,149,0,0.25)",
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}>
                    🔒 Locked
                  </span>
                )}
                {entry.assistant_access && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--theme-accent, #9a0000)",
                    background: "var(--glossy-pill-bg, rgba(154,0,0,0.12))",
                    border: "1px solid var(--glossy-pill-border, rgba(154,0,0,0.25))",
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}>
                    🤖 Mentor
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <p style={{
              fontSize: 13,
              color: isExpanded ? "#C8C8CC" : "#9A9AA0",
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: isExpanded ? "pre-wrap" : "normal",
            }}>
              {isExpanded ? entry.content : preview}
            </p>

            {/* Expanded actions */}
            {isExpanded && (
              <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry.id);
                  }}
                  disabled={deleting === entry.id}
                  style={{
                    background: "rgba(255,59,48,0.1)",
                    border: "1px solid rgba(255,59,48,0.25)",
                    borderRadius: 999,
                    padding: "6px 14px",
                    color: "#ff3b30",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {deleting === entry.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <BottomNav />

      {/* Keyframe for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

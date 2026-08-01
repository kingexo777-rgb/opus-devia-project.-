import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import BottomNav from "../components/home/BottomNav";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

type ModelId = "MENTOR" | "ASSISTANT";

const MODEL_INFO: Record<ModelId, { label: string; subtitle: string }> = {
  MENTOR: { label: "Mentor", subtitle: "DeepSeek V4 Pro" },
  ASSISTANT: { label: "Assistant", subtitle: "Gemini 2.5 Flash" },
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: ModelId;
  messages: Message[];
}

function calcLevel(earnedXP: number): number {
  return Math.max(1, Math.floor(earnedXP / 100));
}

function formatSessionTitle(title: string, createdAt: string) {
  return title || `New chat · ${new Date(createdAt).toLocaleDateString()}`;
}

// ── Message formatter: raw LLM text → styled HTML ──
function formatMessage(raw: string): string {
  let text = raw
    // Normalize em-dashes and long dashes
    .replace(/—/g, "—")
    .replace(/–/g, "–")
    // But wait — we want to replace them with regular dashes for cleanliness
    .replace(/[—–]/g, "-");

  const lines = text.split("\n");
  const out: string[] = [];
  let inList = false;
  let listTag: "ul" | "ol" | null = null;
  let i = 0;

  const flushList = () => {
    if (inList && listTag) {
      out.push(`</${listTag}>`);
      inList = false;
      listTag = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line: close any open list, emit paragraph break
    if (trimmed === "") {
      flushList();
      i++;
      continue;
    }

    // Bullet list: "- item" or "* item" or "• item"
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (!inList || listTag !== "ul") {
        flushList();
        out.push("<ul>");
        inList = true;
        listTag = "ul";
      }
      out.push(`<li>${inlineFormat(bulletMatch[1])}</li>`);
      i++;
      continue;
    }

    // Numbered list: "1. item" or "1) item"
    const numMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numMatch) {
      if (!inList || listTag !== "ol") {
        flushList();
        out.push("<ol>");
        inList = true;
        listTag = "ol";
      }
      out.push(`<li>${inlineFormat(numMatch[1])}</li>`);
      i++;
      continue;
    }

    // Regular text line
    flushList();

    // Group consecutive non-empty, non-list lines into a paragraph
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].trim().match(/^[-*•]\s+/) && !lines[i].trim().match(/^\d+[.)]\s+/)) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const body = paraLines.map((l) => inlineFormat(l.trim())).join("<br/>");
      out.push(`<p>${body}</p>`);
    }
  }

  flushList();
  return out.join("\n");
}

// Inline formatting: bold, italic, code
function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`\n]+?)`/g, "<code>$1</code>");
}

export default function MentorChat() {
  const { user, profile } = useAuth();
  const displayName = profile?.display_name || "KING";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome back, KING. I'm your mentor — here to push you past every limit. Ask me anything or tell me what you're working on.",
    },
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("mentor_task_proof_prompt");
    if (!stored) return;

    try {
      const payload = JSON.parse(stored) as {
        title: string;
        description: string;
        xpReward: number;
      };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `You just submitted proof for \"${payload.title}\". Tell me what you built and attach any image or proof you have. If you have a screenshot, paste the link or describe it clearly.`,
        },
      ]);
    } catch {
      // ignore invalid prompt payload
    } finally {
      window.localStorage.removeItem("mentor_task_proof_prompt");
    }
  }, []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelId>("MENTOR");
  const [menuOpen, setMenuOpen] = useState(false);
  const [assertiveness, setAssertiveness] = useState(profile?.assertiveness_level ?? 7);
  const [earnedXP, setEarnedXP] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessionId);
  const [sessionPromptVisible, setSessionPromptVisible] = useState(false);
  const [hasLoadedSessions, setHasLoadedSessions] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const getSessionStorageKey = () => `mentor-chat-sessions-${user?.id ?? "anonymous"}`;

  const loadSessions = useCallback(() => {
    if (typeof window === "undefined") return [] as ChatSession[];
    try {
      const stored = window.localStorage.getItem(getSessionStorageKey());
      const parsed = stored ? (JSON.parse(stored) as ChatSession[]) : [] as ChatSession[];
      return parsed
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch {
      return [] as ChatSession[];
    }
  }, [user?.id]);

  const saveSessions = useCallback((updatedSessions: ChatSession[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(getSessionStorageKey(), JSON.stringify(updatedSessions));
    } catch {
      // ignore storage failure
    }
  }, [user?.id]);

  const deriveSessionTitle = useCallback((msgs: Message[]): string => {
    const firstUser = msgs.find((m) => m.role === "user");
    if (!firstUser) return "New chat";
    const raw = firstUser.content.trim();
    return raw.length > 50 ? raw.slice(0, 47) + "..." : raw;
  }, []);

  const persistCurrentSession = useCallback((updatedMessages: Message[], updatedModel: ModelId) => {
    setSessions((prev) => {
      const now = new Date().toISOString();
      const existing = prev.find((s) => s.id === activeSessionId);
      const title = deriveSessionTitle(updatedMessages);
      const session: ChatSession = {
        id: activeSessionId,
        title,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        model: updatedModel,
        messages: updatedMessages,
      };
      const without = prev.filter((s) => s.id !== activeSessionId);
      const next = [session, ...without];
      saveSessions(next);
      return next;
    });
  }, [activeSessionId, deriveSessionTitle, saveSessions]);

  const createNewSession = useCallback(() => {
    const newId = crypto.randomUUID();
    setSessionId(newId);
    setActiveSessionId(newId);
    const newSession: ChatSession = {
      id: newId,
      title: "New chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: activeModel,
      messages: [
        {
          id: "welcome",
          role: "assistant",
          content: "Welcome back, KING. I'm your mentor — here to push you past every limit. Ask me anything or tell me what you're working on.",
        },
      ],
    };
    setMessages(newSession.messages);
    setSessions((prev) => [newSession, ...prev]);
    saveSessions([newSession, ...sessions.filter((s) => s.id !== newId)]);
    setSessionPromptVisible(false);
  }, [activeModel, saveSessions, sessions]);

  const loadSession = useCallback((id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    setActiveSessionId(id);
    setSessionId(id);
    setActiveModel(session.model);
    setMessages(session.messages);
    setSessionPromptVisible(false);
  }, [sessions]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchXp = async () => {
      const { data } = await supabase
        .from("user_xp")
        .select("earned, purchased, rollover")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const e = data.earned ?? 0;
        setEarnedXP(e);
        setTotalXP(e + (data.purchased ?? 0) + (data.rollover ?? 0));
        setLevel(calcLevel(e));
      }
    };

    fetchXp();
    const handleXpUpdated = () => fetchXp();
    if (typeof window !== "undefined") {
      window.addEventListener("user_xp_updated", handleXpUpdated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("user_xp_updated", handleXpUpdated);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (profile?.assertiveness_level != null) {
      setAssertiveness(profile.assertiveness_level);
    }
  }, [profile?.assertiveness_level]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!user?.id || hasLoadedSessions) return;
    const storedSessions = loadSessions();
    setSessions(storedSessions);
    setHasLoadedSessions(true);

    if (storedSessions.length > 0) {
      setSessionPromptVisible(true);
    }
  }, [hasLoadedSessions, loadSessions, user?.id]);

  useEffect(() => {
    if (!hasLoadedSessions) return;
    persistCurrentSession(messages, activeModel);
  }, [activeModel, hasLoadedSessions, messages, persistCurrentSession]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const feature = activeModel === "MENTOR" ? "mentor_message" : "assistant_message";
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setSending(true);

    let fullContent = "";

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      if (!token) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Session expired. Please sign in again.", isStreaming: false, isError: true }
              : m,
          ),
        );
        setSending(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-router`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
          },
          body: JSON.stringify({ sessionId, feature, prompt: text }),
        },
      );

      // Non-OK response — preflight denied, tier blocked, etc.
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const reason: string = errBody?.error ?? errBody?.reason ?? "";
        const errorMsg =
          reason === "insufficient_xp"
            ? "You don't have enough XP for this. Complete quests to earn more, then try again."
            : reason === "feature_not_available"
              ? "Mentor is not available on your current tier. Upgrade to Builder or higher."
              : `Mentor engine error (${res.status}). Try again in a moment.`;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errorMsg, isStreaming: false, isError: true }
              : m,
          ),
        );
        setSending(false);
        return;
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      // ── Streaming read loop ──
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.delta) {
              fullContent += data.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent } : m,
                ),
              );
            }
          } catch {
            // Skip unparseable SSE lines
          }
        }
      }

      // Stream complete — mark finished
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m,
        ),
      );

      // Trigger XP refresh (billing finalized in background)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("user_xp_updated"));
      }
    } catch (err) {
      console.error("[MentorChat] Streaming error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: fullContent || "I'm having trouble connecting to the mentor engine. Try again in a moment—your progress is still being tracked.",
                isStreaming: false,
                isError: true,
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  }, [input, sending, activeModel, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const switchModel = (m: ModelId) => {
    setActiveModel(m);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Switched to ${MODEL_INFO[m].label} (${MODEL_INFO[m].subtitle}). How can I help?`,
      },
    ]);
  };

  const saveAssertiveness = async (val: number) => {
    setAssertiveness(val);
    if (user?.id) {
      await supabase.from("users").update({ assertiveness_level: val }).eq("id", user.id);
    }
  };

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "transparent",
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        padding: "2px 0 90px",
      }}
    >
      {sessionPromptVisible && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 200,
            background: "rgba(0, 0, 0, 0.88)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: 28,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              background: "rgba(12, 12, 14, 0.96)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: 28,
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#ffffff", marginBottom: 12, fontSize: 24 }}>
              Continue your last chat?
            </h2>
            <p style={{ color: "#B0B0B0", marginBottom: 24, fontSize: 14 }}>
              Pick up where you left off with your most recent conversation, or start a fresh chat.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                onClick={() => {
                  if (sessions.length > 0) {
                    loadSession(sessions[0].id);
                  }
                }}
                style={{
                  background: "var(--theme-accent, #ff3b30)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 14,
                  padding: "12px 18px",
                  cursor: sessions.length > 0 ? "pointer" : "not-allowed",
                  opacity: sessions.length > 0 ? 1 : 0.5,
                }}
              >
                Continue last chat
              </button>
              <button
                onClick={createNewSession}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: "12px 18px",
                  cursor: "pointer",
                }}
              >
                Start new chat
              </button>
            </div>
          </div>
        </div>
      )}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 20px 8px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "none",
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B0B0B0" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          <span style={{ color: "#ffffff", fontSize: 22, fontWeight: 900, letterSpacing: "0.5px" }}>
            {displayName}
          </span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--theme-accent, #ff3b30)",
              boxShadow: "0 0 8px var(--theme-accent-glow, rgba(255,59,48,0.6))",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              position: "relative",
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: `conic-gradient(var(--theme-accent, #ff3b30) ${(earnedXP % 100)}%, transparent ${(earnedXP % 100)}% 100%)`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#0a0a0a",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#ef9f27", fontSize: 11, fontWeight: 700 }}>
                {level}
              </span>
            </div>
          </div>

          <span style={{
            color: "#ef9f27",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}>
            {fmt(earnedXP)} XP
          </span>

          <Link
            to="/settings"
            aria-label="Settings"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "none",
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B0B0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </header>

      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 280,
            height: "100vh",
            background: "var(--settings-card-bg, rgba(22, 14, 14, 0.95))",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRight: "1px solid var(--theme-accent-dim, rgba(255,59,48,0.2))",
            zIndex: 100,
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setMenuOpen(false)}
              style={{ background: "transparent", border: "none", color: "#B0B0B0", fontSize: 20, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          <div>
            <span style={{
              display: "block", fontSize: 10, color: "#8A8A8F",
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
            }}>
              Model
            </span>
            {(Object.keys(MODEL_INFO) as ModelId[]).map((model) => (
              <button
                key={model}
                onClick={() => { switchModel(model); setMenuOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "12px 16px", borderRadius: 12,
                  border: activeModel === model ? "1px solid var(--theme-accent, #ff3b30)" : "1px solid transparent",
                  background: activeModel === model ? "var(--theme-accent-dim, rgba(255,59,48,0.12))" : "rgba(255,255,255,0.03)",
                  color: "#e0e0e0", fontSize: 14, cursor: "pointer", marginBottom: 6,
                }}
              >
                <div style={{ fontWeight: 600 }}>{MODEL_INFO[model].label}</div>
                <div style={{ fontSize: 11, color: "#8A8A8F", marginTop: 2 }}>{MODEL_INFO[model].subtitle}</div>
              </button>
            ))}
          </div>

          <div>
            <span style={{
              display: "block", fontSize: 10, color: "#8A8A8F",
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
            }}>
              Assertiveness: {assertiveness}/10
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={assertiveness}
              onChange={(e) => saveAssertiveness(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--theme-accent, #ff3b30)" }}
            />
          </div>

          <div>
            <span style={{
              display: "block", fontSize: 10, color: "#8A8A8F",
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,
            }}>
              XP Balance
            </span>
            <div style={{ color: "#ef9f27", fontSize: 18, fontWeight: 700 }}>{fmt(earnedXP)} XP</div>
            <div style={{ color: "#8A8A8F", fontSize: 12 }}>Level {level} · {fmt(totalXP)} total</div>
          </div>

          <div>
            <span style={{
              display: "block", fontSize: 10, color: "#8A8A8F",
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,
            }}>
              Chat History
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.length === 0 ? (
                <div style={{ color: "#B0B0B0", fontSize: 13 }}>
                  No previous chats yet.
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => { loadSession(session.id); setMenuOpen(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "12px 14px", borderRadius: 12,
                      border: activeSessionId === session.id ? "1px solid var(--theme-accent, #ff3b30)" : "1px solid rgba(255,255,255,0.08)",
                      background: activeSessionId === session.id ? "rgba(255,59,48,0.12)" : "rgba(255,255,255,0.03)",
                      color: "#e0e0e0", fontSize: 13, cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {formatSessionTitle(session.title, session.createdAt)}
                    </div>
                    <div style={{ fontSize: 11, color: "#8A8A8F" }}>
                      Updated {new Date(session.updatedAt).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => { setMenuOpen(false); createNewSession(); }}
              style={{
                marginTop: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "10px 16px", color: "#B0B0B0",
                fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center",
              }}
            >
              Start new chat
            </button>
          </div>
        </div>
      )}

      <div
        ref={chatRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px 110px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "calc(100vh - 240px)",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              className={msg.role === "assistant" ? "chat-message" : ""}
              style={{
                maxWidth: "82%",
                padding: "14px 18px",
                borderRadius: msg.role === "user" ? "24px 24px 6px 24px" : "24px 24px 24px 6px",
                background: msg.role === "user" ? "#1a1a1a" : "var(--settings-card-bg, rgba(22, 14, 14, 0.75))",
                border: msg.role === "user" ? "1px solid #2a2a2a" : "1px solid var(--theme-accent-dim, rgba(255,59,48,0.2))",
                color: "#e0e0e0",
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <span
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  style={{
                    display: "block",
                  }}
                />
              )}
              {msg.isStreaming && (
                <span
                  className="streaming-cursor"
                  style={{
                    display: "inline",
                    color: "var(--theme-accent, #ff3b30)",
                  }}
                >
                  ▌
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 94,
          left: 12,
          right: 12,
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(18,18,18,0.35) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 28,
          display: "flex",
          alignItems: "center",
          padding: "6px 6px 6px 22px",
          border: "1px solid rgba(255,59,48,0.5)",
          boxShadow:
            "0 0 0 1px rgba(255,59,48,0.4), 0 0 16px rgba(255,59,48,0.25), 0 0 40px rgba(255,59,48,0.08), 0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${MODEL_INFO[activeModel].label.toLowerCase()}...`}
          disabled={sending}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "#ffffff",
            fontSize: 15,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          aria-label="Send"
          style={{
            background: input.trim() ? "var(--theme-accent, #ff3b30)" : "#2a2a2a",
            border: "none",
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: input.trim() ? "pointer" : "default",
            transition: "background 0.25s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

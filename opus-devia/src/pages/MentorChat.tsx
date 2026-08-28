import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import BottomNav from "../components/home/BottomNav";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const MicIcon = ({ size = 18, opacity = 0.7 }: { size?: number; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const AttachIcon = ({ size = 18, opacity = 0.7 }: { size?: number; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

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
  imagePreview?: string;
  imageDescription?: string;
  linkUrl?: string;
  documentText?: string;
  documentFileName?: string;
}

interface PendingAttachment {
  base64: string;
  mimeType: string;
  previewUrl: string;
  fileName?: string;
  isDocument?: boolean;
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

function formatMessage(raw: string): string {
  let text = raw.replace(/—/g, "—").replace(/–/g, "–").replace(/[—–]/g, "-");
  const lines = text.split("\n");
  const out: string[] = [];
  let inList = false;
  let listTag: "ul" | "ol" | null = null;
  let i = 0;
  const flushList = () => { if (inList && listTag) { out.push(`</${listTag}>`); inList = false; listTag = null; } };
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "") { flushList(); i++; continue; }
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) { if (!inList || listTag !== "ul") { flushList(); out.push("<ul>"); inList = true; listTag = "ul"; } out.push(`<li>${inlineFormat(bulletMatch[1])}</li>`); i++; continue; }
    const numMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numMatch) { if (!inList || listTag !== "ol") { flushList(); out.push("<ol>"); inList = true; listTag = "ol"; } out.push(`<li>${inlineFormat(numMatch[1])}</li>`); i++; continue; }
    flushList();
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].trim().match(/^[-*•]\s+/) && !lines[i].trim().match(/^\d+[.)]\s+/)) { paraLines.push(lines[i]); i++; }
    if (paraLines.length > 0) { const body = paraLines.map((l) => inlineFormat(l.trim())).join("<br/>"); out.push(`<p>${body}</p>`); }
  }
  flushList();
  return out.join("\n");
}

function inlineFormat(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>").replace(/`([^`\n]+?)`/g, "<code>$1</code>");
}

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_DOCUMENT_MIMES = ["application/pdf", "text/plain", "text/markdown", "text/x-markdown", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const URL_REGEX = /(https?:\/\/[^\s]+)/i;

function readFileAsDataUrl(file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = reader.result as string; const comma = dataUrl.indexOf(","); resolve({ dataUrl, base64: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, mimeType: file.type }); };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function MentorChat() {
  const { user, profile } = useAuth();
  const displayName = profile?.display_name || "KING";

  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", content: "Welcome back, KING. I'm your mentor — here to push you past every limit. Ask me anything or tell me what you're working on." }]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("mentor_task_proof_prompt");
    if (!stored) return;
    try {
      const payload = JSON.parse(stored) as { title: string; description: string; xpReward: number };
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `You just submitted proof for \"${payload.title}\". Tell me what you built and attach any image or proof you have.` }]);
    } catch { /* ignore */ }
    finally { window.localStorage.removeItem("mentor_task_proof_prompt"); }
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
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState("aura-2-asteria");
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);

  const DEEPGRAM_VOICES = [
    { id: "aura-2-asteria", label: "Asteria (F)", description: "Warm, engaging" },
    { id: "aura-2-orion", label: "Orion (M)", description: "Deep, authoritative" },
    { id: "aura-2-luna", label: "Luna (F)", description: "Calm, soothing" },
    { id: "aura-2-arcas", label: "Arcas (M)", description: "Clear, balanced" },
    { id: "aura-2-stella", label: "Stella (F)", description: "Bright, energetic" },
    { id: "aura-2-angus", label: "Angus (M)", description: "Rich, resonant" },
  ];

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const voiceMenuRef = useRef<HTMLDivElement>(null);

  const getSessionStorageKey = () => `mentor-chat-sessions-${user?.id ?? "anonymous"}`;

  const loadSessions = useCallback(() => {
    if (typeof window === "undefined") return [] as ChatSession[];
    try {
      const stored = window.localStorage.getItem(getSessionStorageKey());
      const parsed = stored ? (JSON.parse(stored) as ChatSession[]) : [] as ChatSession[];
      return parsed.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch { return [] as ChatSession[]; }
  }, [user?.id]);

  const saveSessions = useCallback((updatedSessions: ChatSession[]) => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(getSessionStorageKey(), JSON.stringify(updatedSessions)); } catch { /* ignore */ }
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
      const session: ChatSession = { id: activeSessionId, title, createdAt: existing?.createdAt ?? now, updatedAt: now, model: updatedModel, messages: updatedMessages };
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
    const newSession: ChatSession = { id: newId, title: "New chat", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), model: activeModel, messages: [{ id: "welcome", role: "assistant", content: "Welcome back, KING. I'm your mentor — here to push you past every limit. Ask me anything or tell me what you're working on." }] };
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
      const { data } = await supabase.from("user_xp").select("earned, purchased, rollover").eq("user_id", user.id).single();
      if (data) { const e = data.earned ?? 0; setEarnedXP(e); setTotalXP(e + (data.purchased ?? 0) + (data.rollover ?? 0)); setLevel(calcLevel(e)); }
    };
    fetchXp();
    const handleXpUpdated = () => fetchXp();
    if (typeof window !== "undefined") window.addEventListener("user_xp_updated", handleXpUpdated);
    return () => { if (typeof window !== "undefined") window.removeEventListener("user_xp_updated", handleXpUpdated); };
  }, [user?.id]);

  useEffect(() => { if (profile?.assertiveness_level != null) setAssertiveness(profile.assertiveness_level); }, [profile?.assertiveness_level]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setAttachMenuOpen(false); };
    if (attachMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [attachMenuOpen]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  useEffect(() => {
    if (!user?.id || hasLoadedSessions) return;
    const storedSessions = loadSessions();
    setSessions(storedSessions);
    setHasLoadedSessions(true);
    if (storedSessions.length > 0) setSessionPromptVisible(true);
  }, [hasLoadedSessions, loadSessions, user?.id]);

  useEffect(() => { if (!hasLoadedSessions) return; persistCurrentSession(messages, activeModel); }, [activeModel, hasLoadedSessions, messages, persistCurrentSession]);

  const applyImageFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_MIMES.includes(file.type)) { setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "That file type isn't supported for images. Use JPEG, PNG, GIF, or WebP.", isError: true }]); return; }
    if (file.size > 32 * 1024 * 1024) { setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "That image is too large (max 32 MB).", isError: true }]); return; }
    try { const { dataUrl, base64, mimeType } = await readFileAsDataUrl(file); setAttachment({ base64, mimeType, previewUrl: dataUrl, fileName: file.name }); } catch { setAttachment(null); }
  }, []);

  const handleScreenshot = useCallback(async () => {
    setAttachMenuOpen(false);
    try {
      if (navigator.clipboard && "read" in navigator.clipboard) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) { const blob = await item.getType(imageType); const file = new File([blob], "screenshot.png", { type: imageType }); await applyImageFile(file); return; }
        }
      }
    } catch { /* fall through */ }
    pictureInputRef.current?.click();
  }, [applyImageFile]);

  const handleDocumentFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_DOCUMENT_MIMES.includes(file.type)) { setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "That file type isn't supported for documents. Use PDF, Markdown, DOCX, or plain text.", isError: true }]); return; }
    if (file.size > 32 * 1024 * 1024) { setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "That document is too large (max 32 MB).", isError: true }]); return; }
    try { const { dataUrl, base64, mimeType } = await readFileAsDataUrl(file); setAttachment({ base64, mimeType, previewUrl: dataUrl, fileName: file.name, isDocument: true }); } catch { setAttachment(null); }
  }, []);

  const handleDocumentOption = useCallback(() => { setAttachMenuOpen(false); documentInputRef.current?.click(); }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAmplitude = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVoiceAmplitude(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(updateAmplitude);
      };
      updateAmplitude();
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); audioCtx.close(); if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); analyserRef.current = null; setVoiceAmplitude(0); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Microphone access is needed for voice input. Please allow it in your browser settings.", isError: true }]);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") { setIsRecording(false); resolve(null); return; }
      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => { const dataUrl = reader.result as string; const comma = dataUrl.indexOf(","); resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl); };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    });
  }, []);

  const handleVoiceInput = useCallback(async () => {
    if (isRecording) {
      const audioBase64 = await stopRecording();
      if (!audioBase64) return;
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      if (!token) return;
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-router`;
      try {
        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "" }, body: JSON.stringify({ feature: "voice_input", audioBase64 }) });
        if (res.ok) { const data = await res.json(); const transcription = (data.transcription ?? "") as string; if (transcription) setInput(transcription); }
      } catch (err) { console.error("Voice input failed:", err); }
    } else { await startRecording(); }
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target as Node)) setVoiceMenuOpen(false); };
    if (voiceMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [voiceMenuOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && !attachment) || sending) return;
    const feature = activeModel === "MENTOR" ? "mentor_message" : "assistant_message";
    const pendingAttachment = attachment;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, imagePreview: pendingAttachment?.previewUrl };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", isStreaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setSending(true);
    setAttachMenuOpen(false);
    const fail = (content: string) => { setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content, isStreaming: false, isError: true } : m)); };
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      if (!token) { fail("Session expired. Please sign in again."); return; }
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-router`;
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "" };
      let finalPrompt = text;

      if (pendingAttachment && !pendingAttachment.isDocument) {
        const visionRes = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ feature: "image_upload", imageBase64: pendingAttachment.base64, imageMimeType: pendingAttachment.mimeType, prompt: text }) });
        if (!visionRes.ok) { const errBody = await visionRes.json().catch(() => ({})); const reason: string = errBody?.error ?? errBody?.reason ?? ""; fail(reason === "insufficient_xp" ? "You don't have enough XP to analyze images." : "I couldn't read that image."); return; }
        const visionData = await visionRes.json();
        const imageDescription = (visionData.imageDescription ?? "") as string;
        setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, imageDescription } : m)));
        finalPrompt = `[The user shared an image. Here is a factual description of what is visible in it:]\n${imageDescription}\n\nUser's message: ${text || "(no text)"}`;
      }

      if (pendingAttachment && pendingAttachment.isDocument) {
        const docRes = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ feature: "document_upload", documentBase64: pendingAttachment.base64, documentMimeType: pendingAttachment.mimeType, documentFileName: pendingAttachment.fileName }) });
        if (!docRes.ok) { const errBody = await docRes.json().catch(() => ({})); const reason: string = errBody?.error ?? errBody?.reason ?? ""; fail(reason === "insufficient_xp" ? "You don't have enough XP to process documents." : "I couldn't read that document."); return; }
        const docData = await docRes.json();
        const docText = (docData.documentText ?? "") as string;
        const docFileName = (docData.documentFileName ?? pendingAttachment.fileName) as string;
        setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, documentText: docText, documentFileName: docFileName } : m)));
        finalPrompt = `[The user shared a document${docFileName ? ` named "${docFileName}"` : ""}. Here is the extracted text content:]\n\n${docText}\n\nUser's message: ${text || "(no text)"}`;
      }

      if (!pendingAttachment) {
        const urlMatch = text.match(URL_REGEX);
        if (urlMatch) {
          const linkUrl = urlMatch[1];
          const linkRes = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ feature: "fetch_link", url: linkUrl }) });
          if (!linkRes.ok) { fail("That link couldn't be processed."); return; }
          const linkData = await linkRes.json();
          setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, linkUrl } : m)));
          finalPrompt = `[The user shared a link: ${linkUrl}]\nHere is a summary of that page:\n${linkData.summary ?? ""}\n\nUser's message: ${text}`;
        }
      }

      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ sessionId, feature, prompt: finalPrompt }) });
      if (!res.ok) { const errBody = await res.json().catch(() => ({})); const reason: string = errBody?.error ?? errBody?.reason ?? ""; fail(reason === "insufficient_xp" ? "You don't have enough XP for this." : `Mentor engine error (${res.status}).`); return; }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
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
          try { const data = JSON.parse(jsonStr); if (data.delta) { fullContent += data.delta; setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m)); } } catch { /* skip */ }
        }
      }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
      if (typeof window !== "undefined") window.dispatchEvent(new Event("user_xp_updated"));
    } catch (err) {
      console.error("[MentorChat] Streaming error:", err);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "I'm having trouble connecting to the mentor engine.", isStreaming: false, isError: true } : m));
    } finally { setSending(false); setAttachment(null); }
  }, [input, sending, activeModel, sessionId, attachment]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const switchModel = (m: ModelId) => { setActiveModel(m); setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Switched to ${MODEL_INFO[m].label} (${MODEL_INFO[m].subtitle}). How can I help?` }]); };

  const saveAssertiveness = async (val: number) => { setAssertiveness(val); if (user?.id) await supabase.from("users").update({ assertiveness_level: val }).eq("id", user.id); };

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div style={{ position: "relative", overflow: "hidden", background: "transparent", maxWidth: 430, margin: "0 auto", minHeight: "100vh", padding: "2px 0 90px" }}>
      {sessionPromptVisible && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "rgba(0, 0, 0, 0.88)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 28 }}>
          <div style={{ width: "100%", maxWidth: 360, background: "rgba(12, 12, 14, 0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 28, textAlign: "center" }}>
            <h2 style={{ color: "#ffffff", marginBottom: 12, fontSize: 24 }}>Continue your last chat?</h2>
            <p style={{ color: "#B0B0B0", marginBottom: 24, fontSize: 14 }}>Pick up where you left off with your most recent conversation, or start a fresh chat.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={() => { if (sessions.length > 0) loadSession(sessions[0].id); else setSessionPromptVisible(false); }} style={{ background: "var(--theme-accent, #ff3b30)", border: "none", color: "#fff", padding: "12px 24px", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Continue</button>
              <button onClick={createNewSession} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#B0B0B0", padding: "12px 24px", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>New Chat</button>
            </div>
          </div>
        </div>
      )}

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px", position: "relative", zIndex: 10 }}>
        <div style={{ position: "relative" }} ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B0B0B0" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 18, marginLeft: 8 }}>{displayName}</span>
          {menuOpen && (
            <div style={{ position: "absolute", top: 44, left: 0, width: 280, background: "rgba(18,18,20,0.98)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 300 }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ color: "#e0e0e0", fontSize: 14, fontWeight: 600 }}>Model</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {(["MENTOR", "ASSISTANT"] as ModelId[]).map((m) => (
                    <button key={m} onClick={() => { switchModel(m); setMenuOpen(false); }} style={{ flex: 1, background: activeModel === m ? "var(--theme-accent, #ff3b30)" : "rgba(255,255,255,0.06)", border: "none", color: "#fff", padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{MODEL_INFO[m].label}</button>
                  ))}
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ color: "#e0e0e0", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Assertiveness</div>
                <input type="range" min="1" max="5" value={assertiveness} onChange={(e) => saveAssertiveness(Number(e.target.value))} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8A8A8F" }}><span>Supportive</span><span>Blunt</span></div>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ color: "#e0e0e0", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Sessions</div>
                {sessions.slice(0, 5).map((s) => (
                  <button key={s.id} onClick={() => { loadSession(s.id); setMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: s.id === activeSessionId ? "rgba(255,59,48,0.12)" : "transparent", border: "none", color: s.id === activeSessionId ? "#ff3b30" : "#B0B0B0", padding: "8px 10px", borderRadius: 8, fontSize: 13, cursor: "pointer", marginBottom: 2 }}>{formatSessionTitle(s.title, s.createdAt)}</button>
                ))}
                <button onClick={() => { createNewSession(); setMenuOpen(false); }} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", color: "#B0B0B0", padding: "8px 0", borderRadius: 10, fontSize: 13, cursor: "pointer", marginTop: 6 }}>+ New Chat</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--theme-accent, #ff3b30)", fontSize: 20, fontWeight: 800 }}>{level}</div>
            <div style={{ color: "#8A8A8F", fontSize: 11 }}>{fmt(totalXP)} XP</div>
          </div>
          <Link to="/settings" style={{ color: "#B0B0B0" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </Link>
        </div>
      </header>

      <div ref={chatRef} style={{ padding: "0 16px", overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 16, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", background: msg.role === "user" ? "var(--theme-accent, #ff3b30)" : msg.isError ? "rgba(255,59,48,0.15)" : "rgba(255,255,255,0.08)", borderRadius: 18, padding: "12px 16px", color: msg.isError ? "#ff6b6b" : "#e0e0e0", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {msg.role === "user" ? (
                <>
                  {msg.imagePreview && (<img src={msg.imagePreview} alt="Attached" style={{ display: "block", width: "100%", maxWidth: 260, maxHeight: 220, objectFit: "cover", borderRadius: 14, marginBottom: 10, border: "1px solid rgba(255,255,255,0.12)" }} />)}
                  {msg.documentFileName && (<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}><span style={{ fontSize: 22 }}>📄</span><div><div style={{ color: "#e0e0e0", fontSize: 13, fontWeight: 600 }}>{msg.documentFileName}</div><div style={{ color: "#8A8A8F", fontSize: 11 }}>Document attached</div></div></div>)}
                  {msg.content ? (<span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>) : null}
                  {msg.linkUrl && (<a href={msg.linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "var(--theme-accent, #ff3b30)", textDecoration: "underline", wordBreak: "break-all" }}>{msg.linkUrl}</a>)}
                  {msg.imageDescription && (<details style={{ marginTop: 10, fontSize: 12, color: "#9a9a9a" }}><summary style={{ cursor: "pointer", color: "#B0B0B0", fontWeight: 600 }}>What Opus saw</summary><div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{msg.imageDescription}</div></details>)}
                  {msg.documentText && (<details style={{ marginTop: 10, fontSize: 12, color: "#9a9a9a" }}><summary style={{ cursor: "pointer", color: "#B0B0B0", fontWeight: 600 }}>What Opus read</summary><div style={{ marginTop: 6, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>{msg.documentText}</div></details>)}
                </>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} style={{ display: "block" }} />
              )}
              {msg.isStreaming && (<span className="streaming-cursor" style={{ display: "inline", color: "var(--theme-accent, #ff3b30)" }}>▌</span>)}
            </div>
          </div>
        ))}
      </div>

      {attachment && (
        <div style={{ position: "absolute", bottom: 162, left: 16, right: 16, display: "flex", alignItems: "center", gap: 12, background: "rgba(20,20,20,0.92)", border: "1px solid rgba(255,59,48,0.4)", borderRadius: 16, padding: 10, zIndex: 50 }}>
          {attachment.isDocument ? (<div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 22, flexShrink: 0 }}>📄</div>) : (<img src={attachment.previewUrl} alt="Attachment preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 10 }} />)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#e0e0e0", fontSize: 13, fontWeight: 600 }}>{attachment.isDocument ? (attachment.fileName ?? "Document attached") : "Image attached"}</div>
            <div style={{ color: "#8A8A8F", fontSize: 11 }}>Add a caption, then send.</div>
          </div>
          <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment" style={{ background: "rgba(255,255,255,0.08)", border: "none", width: 30, height: 30, borderRadius: "50%", color: "#B0B0B0", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 94, left: 12, right: 12, background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(18,18,18,0.35) 100%)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: 28, display: "flex", alignItems: "center", padding: "6px 8px 6px 8px", border: "1px solid rgba(255,59,48,0.5)", boxShadow: "0 0 0 1px rgba(255,59,48,0.4), 0 0 16px rgba(255,59,48,0.25), 0 0 40px rgba(255,59,48,0.08), 0 8px 32px rgba(0,0,0,0.6)" }}>
        <div ref={attachMenuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button type="button" onClick={() => setAttachMenuOpen((o) => !o)} aria-label="Add attachment" style={{ background: attachMenuOpen ? "var(--theme-accent-dim, rgba(255,59,48,0.2))" : "rgba(255,255,255,0.08)", border: "none", width: 36, height: 36, borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", padding: 0 }}>
            <AttachIcon size={18} opacity={0.7} />
          </button>
          {attachMenuOpen && (
            <div style={{ position: "absolute", bottom: 48, left: 0, width: 264, background: "rgba(18, 18, 20, 0.98)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 300 }}>
              <button type="button" onClick={handleDocumentOption} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 12px", borderRadius: 12, cursor: "pointer" }}><span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 16, flexShrink: 0 }}>📄</span><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>Document</span><span style={{ display: "block", fontSize: 11, color: "#8A8A8F" }}>PDF, Markdown, DOCX</span></span></button>
              <button type="button" onClick={() => { setAttachMenuOpen(false); pictureInputRef.current?.click(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 12px", borderRadius: 12, cursor: "pointer" }}><span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 16, flexShrink: 0 }}>🖼️</span><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>Picture</span><span style={{ display: "block", fontSize: 11, color: "#8A8A8F" }}>From your library</span></span></button>
              <button type="button" onClick={() => { setAttachMenuOpen(false); cameraInputRef.current?.click(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 12px", borderRadius: 12, cursor: "pointer" }}><span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 16, flexShrink: 0 }}>📷</span><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>Camera</span><span style={{ display: "block", fontSize: 11, color: "#8A8A8F" }}>Take a photo</span></span></button>
              <button type="button" onClick={handleScreenshot} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 12px", borderRadius: 12, cursor: "pointer" }}><span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 16, flexShrink: 0 }}>📸</span><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>Screenshot</span><span style={{ display: "block", fontSize: 11, color: "#8A8A8F" }}>From clipboard</span></span></button>
            </div>
          )}
        </div>

        <div style={{ position: "relative", flexShrink: 0, marginLeft: 4 }}>
          {isRecording && (
            <div style={{ position: "absolute", bottom: 44, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "flex-end", gap: 2, height: 32, background: "rgba(12,12,14,0.9)", borderRadius: 12, padding: "6px 10px", border: "1px solid rgba(255,59,48,0.3)" }}>
              {Array.from({ length: 8 }).map((_, i) => { const h = 4 + Math.sin((voiceAmplitude * 3) + i * 0.7) * 12 + voiceAmplitude * 16; return (<div key={i} style={{ width: 3, height: Math.max(4, h), borderRadius: 2, background: `hsl(${350 + i * 5}, 90%, ${50 + voiceAmplitude * 30}%)`, transition: "height 0.08s ease, background 0.08s ease" }} />); })}
            </div>
          )}
          <button type="button" onClick={handleVoiceInput} aria-label={isRecording ? "Stop recording" : "Voice input"} style={{ background: isRecording ? "var(--theme-accent, #ff3b30)" : "rgba(255,255,255,0.08)", border: "none", width: 36, height: 36, borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", padding: 0, transition: "background 0.2s ease", color: isRecording ? "#ffffff" : "#B0B0B0" }}>
            <MicIcon size={18} opacity={isRecording ? 1 : 0.7} />
          </button>
        </div>

        <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isRecording ? "Listening..." : attachment ? "Add a caption (optional)..." : `Message ${MODEL_INFO[activeModel].label.toLowerCase()}...`} disabled={sending || isRecording} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#ffffff", fontSize: 15, padding: "0 8px", minWidth: 0 }} />

        <div ref={voiceMenuRef} style={{ position: "relative", flexShrink: 0, marginRight: 4 }}>
          <button type="button" onClick={() => setVoiceMenuOpen((o) => !o)} aria-label="Select voice" style={{ background: "rgba(255,255,255,0.06)", border: "none", width: 30, height: 30, borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", fontSize: 12, color: "#B0B0B0" }}>🔊</button>
          {voiceMenuOpen && (
            <div style={{ position: "absolute", bottom: 40, right: 0, width: 220, background: "rgba(18,18,20,0.98)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 300 }}>
              {DEEPGRAM_VOICES.map((v) => (<button key={v.id} type="button" onClick={() => { setSelectedVoice(v.id); setVoiceMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: selectedVoice === v.id ? "rgba(255,59,48,0.15)" : "transparent", border: "none", padding: "8px 10px", borderRadius: 10, cursor: "pointer" }}><span style={{ fontSize: 14 }}>{selectedVoice === v.id ? "🔊" : "🔈"}</span><span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#e0e0e0" }}>{v.label}</span><span style={{ display: "block", fontSize: 10, color: "#8A8A8F" }}>{v.description}</span></span></button>))}
            </div>
          )}
        </div>

        <button type="button" onClick={sendMessage} disabled={sending || (!input.trim() && !attachment)} aria-label="Send" style={{ background: sending || (!input.trim() && !attachment) ? "rgba(255,255,255,0.06)" : "var(--theme-accent, #ff3b30)", border: "none", width: 36, height: 36, borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", cursor: sending || (!input.trim() && !attachment) ? "default" : "pointer", transition: "background 0.2s ease" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>

      <input ref={pictureInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: "none" }} onChange={(e) => { applyImageFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" capture="environment" style={{ display: "none" }} onChange={(e) => { applyImageFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={documentInputRef} type="file" accept=".pdf,.md,.txt,.docx,application/pdf,text/plain,text/markdown,text/x-markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={(e) => { handleDocumentFile(e.target.files?.[0]); e.target.value = ""; }} />

      <BottomNav />
    </div>
  );
}
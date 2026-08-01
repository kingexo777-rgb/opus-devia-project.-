import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

interface ArchetypeRevealProps {
  archetype: string;
}

const ARCHETYPE_MAP: Record<
  string,
  { name: string; description: string }
> = {
  closer: {
    name: "THE CLOSER",
    description:
      "You sell, you connect, you move fast. Revenue is your language.",
  },
  creator: {
    name: "THE CREATOR",
    description:
      "You build audiences. Your ideas spread. Your brand is your engine.",
  },
  strategist: {
    name: "THE STRATEGIST",
    description:
      "You see the board before others see the pieces. You play the long game.",
  },
  operator: {
    name: "THE OPERATOR",
    description:
      "You build systems. You scale what works. You make chaos manageable.",
  },
  maverick: {
    name: "THE MAVERICK",
    description:
      "You break the template. You cross domains. You do it your way.",
  },
};

const FALLBACK_ARCHETYPE = {
  name: "THE INITIATE",
  description: "Your path is still forming. Every answer matters.",
};

export default function ArchetypeReveal({
  archetype,
}: ArchetypeRevealProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stage, setStage] = useState<
    "hidden" | "label" | "name" | "description" | "button"
  >("hidden");
  const [updating, setUpdating] = useState(false);

  const archetypeData =
    ARCHETYPE_MAP[archetype?.toLowerCase()] ?? FALLBACK_ARCHETYPE;

  // Entrance animation sequence
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 0.0s — screen fades in from black (handled via CSS transition on mount)
    // 0.5s — small label fades in
    timers.push(setTimeout(() => setStage("label"), 500));
    // 1.0s — archetype name slams in
    timers.push(setTimeout(() => setStage("name"), 1000));
    // 1.8s — description fades in
    timers.push(setTimeout(() => setStage("description"), 1800));
    // 2.5s — button fades in
    timers.push(setTimeout(() => setStage("button"), 2500));

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = async () => {
    if (!user || updating) return;
    setUpdating(true);

    try {
      // Update user — onboarding_complete = true
      const updatePayload: Record<string, unknown> = { onboarding_complete: true };
      await supabase.from("users").update(updatePayload).eq("id", user.id);

      // Update onboarding_sessions — status = 'complete'
      await supabase
        .from("onboarding_sessions")
        .update({ status: "complete" })
        .eq("user_id", user.id)
        .eq("status", "processing");

      navigate("/home", { replace: true });
    } catch {
      // Navigate anyway on failure
      navigate("/home", { replace: true });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: `
          radial-gradient(ellipse 40% 35% at 50% 50%, color-mix(in srgb, var(--theme-accent, #9a0000) 18%, transparent) 0%, transparent 70%),
          #000000
        `,
        maxWidth: 430,
        margin: "0 auto",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        opacity: stage === "hidden" ? 0 : 1,
        transition: "opacity 0.8s ease",
        gap: 16,
      }}
    >
      {/* "YOUR ARCHETYPE" label — 0.5s */}
      <p
        className="select-none"
        style={{
          fontSize: 11,
          color: "#A8A8A8",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          opacity: stage !== "hidden" ? 1 : 0,
          transition: "opacity 0.6s ease",
          transitionDelay: stage !== "hidden" ? "0ms" : "0ms",
        }}
      >
        {stage !== "hidden" ? "YOUR ARCHETYPE" : "\u00A0"}
      </p>

      {/* Archetype name — 1.0s slams from below */}
      <h1
        className="select-none"
        style={{
          fontSize: 42,
          fontWeight: 700,
          color: "#F5F5F5",
          lineHeight: 1.1,
          textAlign: "center",
          padding: "0 16px",
          transform:
            stage === "name" ||
            stage === "description" ||
            stage === "button"
              ? "translateY(0)"
              : "translateY(40px)",
          opacity:
            stage === "name" ||
            stage === "description" ||
            stage === "button"
              ? 1
              : 0,
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease",
        }}
      >
        {archetypeData.name}
      </h1>

      {/* Description — 1.8s */}
      <p
        className="select-none text-center"
        style={{
          fontSize: 15,
          color: "#A8A8A8",
          lineHeight: 1.5,
          padding: "0 32px",
          opacity:
            stage === "description" || stage === "button" ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      >
        {archetypeData.description}
      </p>

      {/* Enter button — 2.5s */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 0,
          right: 0,
          padding: "0 24px",
          opacity: stage === "button" ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      >
        <button
          onClick={handleEnter}
          disabled={updating}
          className="w-full font-semibold select-none"
          style={{
            height: 48,
            borderRadius: 12,
            fontSize: 15,
            border: "none",
            cursor: updating ? "not-allowed" : "pointer",
            background: "var(--theme-accent, #9a0000)",
            color: "#F5F5F5",
            opacity: updating ? 0.6 : 1,
            transition: "background 0.2s ease",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          {updating ? "Entering..." : "Enter Opus Devia →"}
        </button>
      </div>

      {/* Mount fade-in keyframe */}
      <style>{`
        @keyframes reveal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
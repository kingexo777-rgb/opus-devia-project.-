import { useEffect, useState } from "react";
import logo from "../../assets/logo.png";

const ROTATING_LINES = [
  "Analysing your responses...",
  "Identifying your archetype...",
  "Mapping your business path...",
  "Building your roadmap...",
  "Almost ready...",
];

export default function ProcessingScreen() {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrentLineIndex(
          (prev) => (prev + 1) % ROTATING_LINES.length
        );
        setFading(false);
      }, 400);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: "#000000",
        maxWidth: 430,
        margin: "0 auto",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        gap: 32,
      }}
    >
      {/* Pulsing logo */}
      <img
        src={logo}
        alt="Opus Devia"
        className="select-none pointer-events-none"
        style={{
          height: 72,
          width: "auto",
          mixBlendMode: "screen",
          animation: "logo-pulse 2s ease-in-out infinite",
        }}
      />

      {/* Rotating status text */}
      <p
        className="select-none text-center"
        style={{
          fontSize: 16,
          color: "#A8A8A8",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          padding: "0 24px",
          transition: "opacity 0.4s ease",
          opacity: fading ? 0 : 1,
        }}
      >
        {ROTATING_LINES[currentLineIndex]}
      </p>

      {/* Inline keyframe for logo pulse */}
      <style>{`
        @keyframes logo-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
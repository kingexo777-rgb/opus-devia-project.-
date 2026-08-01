import { useRef, useEffect, useState } from "react";

interface QuestionCardProps {
  slideIndex: number;
  totalSlides: number;
  title: string;
  subtitle?: string;
  structuredContent?: React.ReactNode;
  textValue: string;
  setTextValue: (v: string) => void;
  textMinChars: number;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  saving: boolean;
  draftSaved: boolean;
  direction: "forward" | "back";
}

export default function QuestionCard({
  slideIndex,
  totalSlides,
  title,
  subtitle,
  structuredContent,
  textValue,
  setTextValue,
  textMinChars,
  onBack,
  onNext,
  onSaveDraft,
  saving,
  draftSaved,
  direction,
}: QuestionCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [animating, setAnimating] = useState(false);
  const prevIndexRef = useRef(slideIndex);
  // mark direction/animating as used to avoid unused var TS errors in some build setups
  void direction;
  void animating;

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, [slideIndex]);

  useEffect(() => {
    if (prevIndexRef.current !== slideIndex) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 300);
      prevIndexRef.current = slideIndex;
      return () => clearTimeout(t);
    }
  }, [slideIndex]);

  const canContinue = textValue.trim().length >= textMinChars;
  const progressPercent = ((slideIndex + 1) / totalSlides) * 100;

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#A8A8A8" }}>Back</button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 11, color: "#A8A8A8", textTransform: "uppercase" }}>Slide {slideIndex + 1} of {totalSlides}</div>
          </div>
          <div style={{ width: 56 }} />
        </div>

        <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginTop: 12, overflow: "hidden" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", background: "var(--theme-accent, #9a0000)", transition: "width 250ms ease" }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 720 }}>
          <div style={{ background: "linear-gradient(180deg, rgba(26,26,30,0.98), rgba(14,14,18,0.98))", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#F5F5F5" }}>{title}</h2>
            {subtitle && <p style={{ marginTop: 6, color: "#A8A8A8" }}>{subtitle}</p>}

            <div style={{ marginTop: 16 }}>{structuredContent}</div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#A8A8A8", marginBottom: 8 }}>Explain in one focused sentence</label>
              <textarea
                ref={textareaRef}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Be specific — 30 characters minimum."
                style={{ width: "100%", minHeight: 120, borderRadius: 12, padding: 12, background: "rgba(255,255,255,0.02)", color: "#F5F5F5", border: "1px solid rgba(255,255,255,0.06)" }}
              />
              <div style={{ textAlign: "right", marginTop: 8, color: "#A8A8A8", fontSize: 12 }}>
                {Math.max(0, textMinChars - textValue.trim().length)} more characters needed
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <button
                onClick={onNext}
                disabled={!canContinue}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: canContinue ? "#9a0000" : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  cursor: canContinue ? "pointer" : "not-allowed",
                }}
              >
                Continue
              </button>

              <button
                onClick={onSaveDraft}
                disabled={saving}
                style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: draftSaved ? "#1d9e75" : "#A8A8A8" }}
              >
                {draftSaved ? "Draft saved" : "Save & Continue Later"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
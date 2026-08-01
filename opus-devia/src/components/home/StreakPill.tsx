interface StreakPillProps {
  streakCount: number;
  weeklyDays: boolean[];
  loading: boolean;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function StreakPill({ streakCount, weeklyDays, loading }: StreakPillProps) {
  if (loading) {
    return (
      <div style={{ margin: "0 12px" }}>
        <div className="card-glass" style={{ padding: "6px 10px", minHeight: 80, opacity: 0.6 }} />
      </div>
    );
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const monBased = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  return (
    <div style={{ margin: "0 10px" }}>
      <div className="card-glass" style={{ padding: "6px 10px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Flame */}
            <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
            <div>
              <p style={{ color: "#A8A8A8", fontSize: 10, fontWeight: 500, marginBottom: 0 }}>{streakCount} Day</p>
              <h2 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "normal", color: "#F5F5F5" }}>Streak</h2>
            </div>
          </div>
          <button style={{
            padding: "4px 10px", borderRadius: 999,
            background: "var(--glossy-pill-bg, rgba(255,255,255,0.04))",
            border: "1px solid var(--glossy-pill-border, rgba(255,255,255,0.08))",
            color: "rgba(255,255,255,0.8)",
            boxShadow: "var(--glossy-pill-shadow, none)",
            fontSize: 8, letterSpacing: "0.12em", fontWeight: 700, cursor: "pointer",
            position: "relative", overflow: "hidden",
          }}>
            KEEP GOING
          </button>
        </div>

        {/* Divider */}
        <div style={{ margin: "4px 0", height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* Week days */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {weeklyDays.map((completed, i) => {
            const isCurrent = i === monBased;
            const isCompleted = completed;

            let bg = "#1c1c1e";
            let border = "none";
            let textColor = "#A8A8A8";
            let content: React.ReactNode = DAY_LABELS[i];

            if (isCompleted) {
              bg = "linear-gradient(180deg, color-mix(in srgb, var(--theme-accent, #9a0000) 22%, transparent), color-mix(in srgb, var(--theme-accent, #9a0000) 8%, transparent))";
              border = "1px solid color-mix(in srgb, var(--theme-accent, #9a0000) 50%, transparent)";
              textColor = "#fff";
              content = "✓";
            } else if (isCurrent) {
              bg = "rgba(255,255,255,0.03)";
              border = "2px solid rgba(255,255,255,0.25)";
              textColor = "rgba(255,255,255,0.8)";
              content = streakCount > 0 ? "•" : DAY_LABELS[i];
            }

            return (
              <div key={i} className={`day ${isCurrent ? "current" : ""}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div className="day-circle" style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: bg, border: border,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: textColor, fontWeight: 600,
                  transition: "0.35s ease",
                  boxShadow: isCompleted ? "0 0 8px var(--theme-accent-dim, rgba(154,0,0,0.2))" : undefined,
                }}>
                  {content}
                </div>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{DAY_LABELS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
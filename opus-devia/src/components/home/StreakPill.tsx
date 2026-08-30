const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface StreakPillProps {
  streakCount: number;
  weeklyDays: boolean[];
  loading: boolean;
}

export default function StreakPill({ streakCount, weeklyDays, loading }: StreakPillProps) {
  if (loading) {
    return (
      <div style={{ margin: "0 16px 12px", display: "flex", gap: 10, height: 110, opacity: 0.6 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 18, flex: "0 0 110px" }} />
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 18, flex: 1 }} />
      </div>
    );
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const monBased = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  return (
    <div style={{ margin: "12px 16px 12px", display: "flex", gap: 10, alignItems: "stretch" }}>

      {/* Left card — flame + count */}
      <div style={{
        background: "rgba(154,0,0,0.15)",
        border: "1px solid rgba(154,0,0,0.25)",
        borderRadius: 18,
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 110,
        gap: 4,
      }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>🔥</span>
        <p style={{ fontSize: 20, fontWeight: 800, color: "#F5F5F5", margin: "6px 0 0" }}>
          {streakCount} Days
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Streak
        </p>
      </div>

      {/* Right card — days + button */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18,
        padding: "16px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
      }}>

        {/* Week days */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {DAY_LABELS.map((label, i) => {
            const isCompleted = weeklyDays[i];
            const isCurrent = i === monBased;

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: isCompleted
                    ? "rgba(154,0,0,0.3)"
                    : isCurrent
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,255,255,0.02)",
                  border: isCompleted
                    ? "1px solid rgba(154,0,0,0.5)"
                    : isCurrent
                    ? "2px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  color: isCompleted ? "#fff" : "rgba(255,255,255,0.3)",
                  fontWeight: 600,
                  opacity: !isCompleted && !isCurrent ? 0.45 : 1,
                }}>
                  {isCompleted ? "✓" : label}
                </div>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Keep Going button */}
        <button style={{
          width: "100%",
          background: "rgba(154,0,0,0.7)",
          border: "none",
          borderRadius: 999,
          padding: "9px 0",
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.12em",
          cursor: "pointer",
        }}>
          KEEP GOING
        </button>

      </div>
    </div>
  );
}
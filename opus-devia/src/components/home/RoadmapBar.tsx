import { Link } from "react-router-dom";

interface RoadmapBarProps {
  completionPercentage: number;
  loading: boolean;
}

export default function RoadmapBar({ completionPercentage, loading }: RoadmapBarProps) {
  if (loading) {
    return (
      <div style={{ margin: "0 12px" }}>
        <div className="card-glass" style={{ padding: "6px 10px", minHeight: 56, opacity: 0.6 }} />
      </div>
    );
  }

  const clamped = Math.min(100, Math.max(0, completionPercentage));
  const milestoneCount = Math.round(clamped / 16.67); // ~6 milestones
  const totalMilestones = 6;

  return (
    <div style={{ margin: "0 12px" }}>
      <Link to="/roadmap" style={{ textDecoration: "none" }}>
        <div className="roadmap-card" style={{ cursor: "pointer" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "normal", color: "#F5F5F5" }}>Roadmap Completion</h2>
            <span style={{ color: "#A8A8A8", fontSize: 13, fontWeight: 700 }}>View roadmap ↗</span>
          </div>

        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 2 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "#ffffff" }}>{Math.round(clamped)}%</span>
          <span style={{ color: "var(--theme-accent, #9a0000)", fontSize: 10, fontWeight: 600 }}>
            {milestoneCount}/{totalMilestones} milestones
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 3, height: 5, borderRadius: 999, background: "#1a1d27", overflow: "hidden" }}>
          <div
            className="progress-fill"
            style={{
            height: "100%", borderRadius: 999,
            width: `${clamped}%`,
            background: "var(--theme-accent, #9a0000)",
            transition: "width 0.7s ease-out",
            boxShadow: "0 0 8px var(--theme-accent, #9a0000)",
          }} />
        </div>

      </div>
    </Link>
  </div>
  );
}

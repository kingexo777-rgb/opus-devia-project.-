import { Link } from "react-router-dom";

export default function MentorButton() {
  return (
    <div style={{ marginTop: 18, padding: "0 0px" }}>
      <Link
        to="/mentor"
        className="mentor-card"
        style={{
          textDecoration: "none", color: "inherit",
          display: "flex", alignItems: "center", gap: 14,
          background: "#181920",
          border: "1px solid var(--theme-accent, #F40000)",
          borderRadius: 18,
          padding: "18px 20px",
        }}
      >
        <svg
          width="26" height="26" viewBox="0 0 24 24"
          fill="none" stroke="var(--theme-accent, #F40000)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: "normal", color: "#f5f5f5" }}>Talk to your Mentor</h3>
          <p style={{ fontSize: 13, color: "#8a8a8e", marginTop: 2, fontWeight: 500 }}>Directions, Decisions, Roadmap edits</p>
        </div>

        <span className="mentor-arrow" style={{ fontSize: 18, color: "#8a8a8e" }}>→</span>
      </Link>
    </div>
  );
}
import { Link } from "react-router-dom";

export default function MentorButton() {
  return (
    <Link
      to="/mentor"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "#181920",
        border: "1px solid var(--theme-accent, #9a0000)",
        borderRadius: 18,
        padding: "16px 20px",
        marginTop: 12,
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: "rgba(154,0,0,0.12)",
        border: "1px solid rgba(154,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg
          width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="var(--theme-accent, #9a0000)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F5F5F5", margin: 0 }}>
          Talk to your Mentor
        </h3>
        <p style={{ fontSize: 12, color: "#8A8A8E", marginTop: 3, fontWeight: 500, margin: "3px 0 0" }}>
          Directions, Decisions, Roadmap edits
        </p>
      </div>

      <span style={{ fontSize: 16, color: "#8A8A8E" }}>→</span>
    </Link>
  );
}
import { Link } from "react-router-dom";

interface HeaderProps {
  username: string;
  earnedXP: number;
  totalXP: number;
  loading: boolean;
}

export default function Header({ username, earnedXP, totalXP, loading }: HeaderProps) {
  // mark props as used to avoid TypeScript unused variable errors in builds
  void earnedXP;
  void totalXP;

  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0 2px", marginTop: "16px" }}>
      {/* Left: Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontWeight: 800, letterSpacing: 0.6, fontSize: 14, color: "#F5F5F5" }}>
          {loading ? "..." : (username || "KING")}
        </span>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--theme-accent, #9a0000)", display: "inline-block" }} />
      </div>

      {/* Right: Settings gear */}
      <Link
        to="/settings"
        style={{ color: "#A8A8A8", padding: 2 }}
        aria-label="Settings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </Link>
    </header>
  );
}

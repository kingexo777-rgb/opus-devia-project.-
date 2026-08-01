import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme, THEME_LABELS, type Theme } from "../context/ThemeContext";
import BottomNav from "../components/home/BottomNav";

const THEME_OPTIONS: Theme[] = ["crimson", "arctic", "gold"];

export default function Settings() {
  const { profile, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const displayName = profile?.display_name || "KING";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "transparent",
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        padding: "2px 0 90px",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px 16px 24px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "none",
            width: 42,
            height: 42,
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
        <div style={{ width: 42 }} />
      </header>

      {/* ── Profile Card ── */}
      <div style={{ padding: "0 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--settings-card-bg, rgba(22, 14, 14, 0.75))",
            border: "1.5px solid var(--theme-accent-dim, rgba(255, 59, 48, 0.4))",
            borderRadius: 24,
            padding: "18px 20px",
            marginBottom: 32,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Avatar Ring */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "2px solid var(--theme-accent, #ff3b30)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "var(--settings-avatar-bg, #140505)",
            }}
          >
            <span style={{ color: "#ffffff", fontSize: 28, fontWeight: 900 }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>

          <h2 style={{ color: "#ffffff", fontSize: 26, fontWeight: 900, marginLeft: 20, letterSpacing: "0.5px" }}>
            {loading ? "..." : displayName}
          </h2>

          <svg
            style={{ marginLeft: "auto", stroke: "#8A8A8F" }}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8A8A8F"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>

        {/* ── Section: Other Settings ── */}
        <p style={{ color: "#8A8A8F", fontSize: 14, fontWeight: 600, marginBottom: 14, paddingLeft: 6 }}>
          Other Settings
        </p>

        {/* Card 1 */}
        <div
          style={{
            background: "var(--settings-card-bg, rgba(22, 14, 14, 0.75))",
            borderRadius: 24,
            padding: "6px 20px",
            marginBottom: 24,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          <MenuItem icon={BellIcon} label="Notifications" />
          <MenuItem icon={XPIcon} label="XP & Gamification" />
          <MenuItem icon={MentorIcon} label="Mentor" />

          {/* ── Appearance with theme picker ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 0",
              borderBottom: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <MoonIcon />
              <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 700, marginLeft: 18 }}>Appearance</span>
            </div>
          </div>

          {/* Theme swatches */}
          <div style={{ display: "flex", gap: 10, paddingBottom: 20, justifyContent: "center" }}>
            {THEME_OPTIONS.map((t) => {
              const info = THEME_LABELS[t];
              const isActive = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  title={info.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    background: isActive ? "var(--glossy-pill-bg, none)" : "none",
                    border: isActive ? "2px solid var(--glossy-pill-border, var(--theme-accent, #ff3b30))" : "2px solid transparent",
                    borderRadius: 16,
                    padding: "8px 12px",
                    cursor: "pointer",
                    transition: "border 0.3s ease, transform 0.2s ease",
                    transform: isActive ? "scale(1.05)" : "scale(1)",
                    boxShadow: isActive ? "var(--glossy-pill-shadow, none)" : "none",
                    position: "relative" as React.CSSProperties["position"],
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: info.swatch,
                      boxShadow: isActive ? "0 0 12px var(--theme-accent-glow, rgba(255,59,48,0.5))" : "0 2px 6px rgba(0,0,0,0.3)",
                    }}
                  />
                  <span
                    style={{
                      color: isActive ? "#ffffff" : "#8A8A8F",
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {info.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            background: "var(--settings-card-bg, rgba(22, 14, 14, 0.75))",
            borderRadius: 24,
            padding: "6px 20px",
            marginBottom: 24,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          <MenuItem icon={LockIcon} label="Data &amp; Privacy" last={false} />
          <MenuItem icon={ExclaimIcon} label="Contact Support" last />
        </div>
      </div>

      {/* ── Sign Out ── */}
      <div style={{ padding: "0 20px", marginTop: 8 }}>
        <Link
          to="/signin"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "var(--settings-card-bg, rgba(22, 14, 14, 0.75))",
            border: "1px solid var(--theme-accent-dim, rgba(255,59,48,0.3))",
            borderRadius: 24,
            padding: "16px 20px",
            color: "var(--theme-accent, #ff3b30)",
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}

/* ── Menu Item ── */
function MenuItem({
  icon: Icon,
  label,
  last = false,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 0",
        borderBottom: last ? "none" : "1px solid rgba(255, 255, 255, 0.04)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <Icon size={22} />
        <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 700, marginLeft: 18 }}>{label}</span>
      </div>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8A8A8F"
        strokeWidth="2"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

/* ── Icons ── */
function BellIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function XPIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function MentorIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MoonIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function LockIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ExclaimIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

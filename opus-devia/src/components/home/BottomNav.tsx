import { Link, useLocation } from "react-router-dom";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: "/home",
    label: "Home",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: "/tasks",
    label: "Quest",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    path: "/roadmap",
    label: "Roadmap",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    path: "/profile",
    label: "Profile",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="dock-glass" style={{
      position: "fixed",
      bottom: 8,
      left: "50%",
      transform: "translateX(-50%)",
      width: "calc(100% - 20px)",
      maxWidth: 413,
      borderRadius: "999px",
      display: "flex",
      justifyContent: "space-around",
      padding: "9px 6px",
      zIndex: 1000,
      /* Theme-driven glass — falls back to crimson default */
      background: "var(--dock-bg, linear-gradient(180deg, rgba(26,26,30,0.42) 0%, rgba(14,14,18,0.50) 100%))",
      border: "var(--dock-border-style, 1px solid rgba(255,255,255,0.10))",
      boxShadow: "var(--dock-shadow, 0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2))",
    }}>
      {/* Top edge highlight */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: "1px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: "999px 999px 0 0",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`dock-item ${isActive ? "active" : ""}`}
            style={{
              position: "relative",
              zIndex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: isActive ? "var(--theme-accent, #c10000)" : "#C8C8C8",
              fontSize: 11,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              textDecoration: "none",
              opacity: isActive ? 1 : 0.85,
              transition: "opacity 0.25s ease, color 0.25s ease, transform 0.3s var(--ease-snappy)",
              filter: isActive ? "drop-shadow(0 0 10px var(--theme-accent-glow, rgba(193,0,0,0.1)))" : "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
            }}
          >
            {/* Glass icon container — subtle hug */}
            <div style={{
              background: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
              borderRadius: 13,
              padding: "5px 9px",
              border: isActive ? "0.5px solid rgba(255,255,255,0.12)" : "0.5px solid rgba(255,255,255,0.05)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.03)" : "inset 0 1px 0 rgba(255,255,255,0.02)",
              transition: "background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {item.icon}
            </div>
            <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
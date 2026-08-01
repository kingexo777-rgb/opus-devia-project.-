export default function QuestChallengeCard() {
  return (
    <article style={styles.card}>
      {/* Title Row */}
      <div style={styles.titleRow}>
        <h1 style={styles.challengeTitle}>Coming Soon</h1>
        <button style={styles.takeOnBtn} disabled>
          Locked
        </button>
      </div>

      {/* Challenge label */}
      <p style={styles.challengeLabel}>Challenge</p>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Description */}
      <p style={styles.description}>
        Challenges are coming in a future update.
      </p>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <div style={styles.statPill}>
          {/* Clock SVG */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>--</span>
        </div>

        <div style={styles.statPill}>
          {/* Crystal/XP SVG */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>-- XP</span>
        </div>
      </div>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: 357,
    borderRadius: 24,
    padding: "20px 30px 30px 30px",
    boxSizing: "border-box",
    background: "rgba(20, 20, 20, 0.25)",
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
    border: "none",
    boxShadow:
      "0 15px 35px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(0, 0, 0, 0.2)",
    marginTop: 20,
    marginLeft: "auto",
    marginRight: "auto",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 0,
  },
  challengeTitle: {
    color: "#ffffff",
    fontSize: 24,
    margin: 0,
  },
  takeOnBtn: {
    height: 30,
    fontSize: 14,
    borderRadius: 20,
    background: "var(--glossy-pill-bg, none)",
    color: "#9F9F9F",
    fontWeight: 500,
    cursor: "not-allowed",
    border: "1px solid var(--glossy-pill-border, #9F9F9F)",
    padding: "0 16px",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
  },
  challengeLabel: {
    color: "#9F9F9F",
    fontSize: 13,
    fontWeight: 500,
    marginTop: 4,
    marginBottom: 4,
  },
  divider: {
    display: "block",
    width: "100%",
    height: 1,
    background:
      "linear-gradient(90deg, rgba(255, 255, 255, 0.25) 50%, rgba(255, 255, 255, 0) 100%)",
    margin: "12px 0",
  },
  description: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 500,
    marginTop: 0,
    marginBottom: 8,
  },
  statsRow: {
    display: "flex",
    flexDirection: "row",
    gap: 16,
    marginTop: 15,
  },
  statPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    background: "var(--glossy-pill-bg, rgba(0, 0, 0, 0.45))",
    border: "1px solid var(--glossy-pill-border, rgba(255,255,255,0.08))",
    padding: "6px 16px",
    borderRadius: 20,
    color: "#9F9F9F",
    fontSize: 14,
    fontWeight: 500,
    boxShadow: "var(--glossy-pill-shadow, none)",
  },
};
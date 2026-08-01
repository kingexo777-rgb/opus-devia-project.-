interface PriorityTaskData {
  taskId: string;
  title: string;
  description: string;
  estimatedHours: number;
  xpReward: number;
}

interface QuestPriorityTaskProps {
  task: PriorityTaskData | null;
  loading: boolean;
  onStart: (taskId: string) => void;
}

function formatDuration(hours: number): string {
  return hours >= 1 ? `${hours}hr${hours !== 1 ? 's' : ''}` : `${Math.round(hours * 60)}min`
}

export default function QuestPriorityTask({
  task,
  loading,
  onStart,
}: QuestPriorityTaskProps) {
  if (loading) {
    return (
      <article style={styles.card}>
        <div style={styles.titleRow}>
          <div
            style={{
              height: 28,
              width: "60%",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 8,
            }}
          />
          <div
            style={{
              height: 30,
              width: 65,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 20,
            }}
          />
        </div>
        <div
          style={{
            height: 14,
            width: "30%",
            background: "rgba(255,77,77,0.08)",
            borderRadius: 4,
            marginTop: 6,
            marginBottom: 4,
          }}
        />
        <div style={styles.divider} />
        <div
          style={{
            height: 14,
            width: "85%",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <div style={styles.statsRow}>
          <div
            style={{
              height: 30,
              width: 70,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 20,
            }}
          />
          <div
            style={{
              height: 30,
              width: 80,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 20,
            }}
          />
        </div>
      </article>
    );
  }

  if (!task) {
    return (
      <article style={styles.card}>
        <div style={{ textAlign: "center", color: "#9F9F9F", fontSize: 14 }}>
          No priority task available.
        </div>
      </article>
    );
  }

  return (
    <article style={styles.card}>
      {/* Title Row */}
      <div style={styles.titleRow}>
        <h1 style={styles.priorityTitle}>{task.title}</h1>
        <button
          style={styles.startBtn}
          onClick={() => onStart(task.taskId)}
        >
          Start
        </button>
      </div>

      {/* Priority label */}
      <p style={styles.priorityLabel}>Priority task</p>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Description */}
      <p style={styles.description}>{task.description}</p>

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
          <span>{formatDuration(task.estimatedHours)}</span>
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
          <span>{task.xpReward} XP</span>
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
    background: "rgba(255, 255, 255, 0.02)",
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
    border: "none",
    boxShadow:
      "0 15px 35px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(0, 0, 0, 0.2)",
    margin: "0 auto",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 0,
  },
  priorityTitle: {
    color: "#ffffff",
    fontSize: 24,
    margin: 0,
  },
  startBtn: {
    height: 30,
    background: "var(--glossy-pill-bg, none)",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 500,
    cursor: "pointer",
    border: "1px solid var(--glossy-pill-border, #9F9F9F)",
    borderRadius: 20,
    padding: "0 16px",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "var(--glossy-pill-shadow, none)",
    position: "relative" as React.CSSProperties["position"],
    overflow: "hidden",
  },
  priorityLabel: {
    color: "#ff4d4d",
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
    background: "var(--glossy-pill-bg, rgba(109, 14, 14, 0.6))",
    border: "1px solid var(--glossy-pill-border, rgba(255,255,255,0.08))",
    padding: "6px 16px",
    borderRadius: 20,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 500,
    boxShadow: "var(--glossy-pill-shadow, none)",
  },
};
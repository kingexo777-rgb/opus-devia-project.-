import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TreasureReward {
  type: string;
  value: Record<string, any>;
}

interface VisibleMapState {
  id: string;
  current_position: number;
  map_number: number;
  is_active: boolean;
  visible_rewards: Record<string, TreasureReward>;
  next_node_preview: TreasureReward | null;
}

interface DailyTask {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  expires_at: string;
  task_date: string;
  phase_theme: string | null;
}

const TOTAL_NODES = 15;
const COLS = [34, 102, 170, 238, 306];
const ROWS = [35, 105, 175];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function nodePosition(node: number): { x: number; y: number } {
  const idx = node - 1;
  const row = Math.floor(idx / 5);
  const col = idx % 5;
  const x = row % 2 === 0 ? COLS[col] : COLS[4 - col];
  return { x, y: ROWS[row] };
}

function freeFeatureLabel(feature: string): string {
  if (feature === "mentor_message") return "Free Mentor Message";
  if (feature === "roadmap_recalibration") return "Roadmap Recalibration";
  return feature.replace(/_/g, " ");
}

function describeReward(
  reward: TreasureReward | null | undefined,
): { label: string; sublabel: string } | null {
  if (!reward) return null;
  const v = reward.value ?? {};
  if (typeof v.amount === "number") {
    return { label: `+${v.amount} XP`, sublabel: "XP reward" };
  }
  if (typeof v.multiplier === "number") {
    return {
      label: `${v.multiplier}x XP Multiplier`,
      sublabel: `${v.duration_days ?? 3} days`,
    };
  }
  if (typeof v.free_feature === "string") {
    return {
      label: freeFeatureLabel(v.free_feature),
      sublabel: `×${v.count ?? 1}`,
    };
  }
  return { label: "Mystery reward", sublabel: "" };
}

function RewardGlyph({ type, size = 16 }: { type: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "xp_multiplier") {
    return (
      <svg {...common}>
        <path d="M13 2 L3 14 h9 l-1 8 10-12 h-9 l1-8 z" />
      </svg>
    );
  }

  if (type === "credit_holiday") {
    return (
      <svg {...common}>
        <path d="M20 12v10H4V12" />
        <path d="M2 7h20v5H2z" />
        <path d="M12 22V7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    );
  }

  if (type === "grand_reward") {
    return (
      <svg {...common}>
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  // xp_bonus — crystal/star
  return (
    <svg {...common}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TreasureMap() {
  const { user } = useAuth();
  const userId = user?.id;

  const [map, setMap] = useState<VisibleMapState | null>(null);
  const [task, setTask] = useState<DailyTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchState = useCallback(async () => {
    if (!userId) return;

    try {
      // Sequential on purpose: the map must exist (and expose its id) before
      // the daily task is generated against it, avoiding a first-run race.
      const mapRes = await supabase.functions.invoke("roadmap-generator", {
        body: { action: "get_or_create_active_map", userId },
      });

      if (mapRes.error) throw mapRes.error;

      const mapData = (mapRes.data?.map ?? mapRes.data ?? null) as
        | VisibleMapState
        | null;
      setMap(mapData);

      if (mapData?.id) {
        const taskRes = await supabase.functions.invoke("roadmap-generator", {
          body: {
            action: "get_or_generate_daily_task",
            userId,
            mapId: mapData.id,
          },
        });

        if (taskRes.error) throw taskRes.error;

        setTask((taskRes.data?.task ?? taskRes.data ?? null) as DailyTask | null);
      }
    } catch (err) {
      console.error("Treasure map fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleComplete = useCallback(async () => {
    if (!userId || !task || completing) return;

    setCompleting(true);
    try {
      const res = await supabase.functions.invoke("roadmap-generator", {
        body: { action: "complete_daily_task", userId, taskId: task.id },
      });

      if (res.error) throw res.error;

      await fetchState();
      // Treasure map rewards can award XP — refresh the header.
      window.dispatchEvent(new Event("user_xp_updated"));
    } catch (err) {
      console.error("Treasure map complete failed:", err);
    } finally {
      setCompleting(false);
    }
  }, [userId, task, completing, fetchState]);

  const currentPosition = map?.current_position ?? 0;
  const nextNode = currentPosition + 1;
  const revealThrough = Math.min(nextNode, TOTAL_NODES);
  const spacesRemaining = Math.max(0, TOTAL_NODES - currentPosition);
  const nextPreview = describeReward(map?.next_node_preview);

  /* Build solid/dashed polylines */
  const solidPoints: string[] = [];
  for (let n = 1; n <= revealThrough; n++) {
    const p = nodePosition(n);
    solidPoints.push(`${p.x},${p.y}`);
  }
  const dashedPoints: string[] = [];
  for (let n = Math.max(1, revealThrough); n <= TOTAL_NODES; n++) {
    const p = nodePosition(n);
    dashedPoints.push(`${p.x},${p.y}`);
  }

  const nodes = Array.from({ length: TOTAL_NODES }, (_, i) => i + 1);

  if (loading) {
    return (
      <article style={styles.card}>
        <div style={styles.eyebrow}>TREASURE MAP</div>
        <div
          style={{
            height: 190,
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 16,
            marginTop: 12,
          }}
        />
      </article>
    );
  }

  return (
    <article style={styles.card}>
      {/* Header row */}
      <div style={styles.headerRow}>
        <div>
          <div style={styles.eyebrow}>SPACES REMAINING</div>
          <div style={styles.spacesCount}>{spacesRemaining}</div>
        </div>

        {nextPreview && (
          <button
            style={styles.previewChip}
            onClick={() => setPreviewOpen(true)}
            aria-label="Preview next reward"
          >
            <span style={styles.chipIcon}>
              <RewardGlyph type={map!.next_node_preview!.type} size={16} />
            </span>
            <span style={styles.chipLabel}>{nextPreview.label}</span>
          </button>
        )}
      </div>

      {/* Winding path */}
      <svg
        viewBox="0 0 340 210"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          <radialGradient id="tmNode" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ff6b5e" />
            <stop offset="100%" stopColor="#a31212" />
          </radialGradient>
        </defs>

        {/* Solid (revealed) portion */}
        {solidPoints.length >= 2 && (
          <polyline
            points={solidPoints.join(" ")}
            fill="none"
            stroke="#ff4d4d"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}

        {/* Dashed (hidden) portion */}
        {dashedPoints.length >= 2 && (
          <polyline
            points={dashedPoints.join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 6"
          />
        )}

        {nodes.map((n) => {
          const p = nodePosition(n);
          const isCurrent = n === currentPosition && currentPosition >= 1;
          const isNext = n === nextNode;
          const isMystery = n > nextNode;
          const isFinale = n === TOTAL_NODES;
          const reward = isNext
            ? map?.next_node_preview
            : n <= currentPosition
              ? map?.visible_rewards?.[String(n)]
              : null;
          const radius = isCurrent ? 22 : isFinale ? 19 : 16;

          return (
            <g
              key={n}
              onClick={isNext ? () => setPreviewOpen(true) : undefined}
              style={{ cursor: isNext ? "pointer" : "default" }}
            >
              {isCurrent && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={radius + 8}
                  fill="none"
                  stroke="#ff4d4d"
                  strokeWidth={2}
                  opacity={0.6}
                  className="tm-pulse"
                />
              )}

              <circle
                cx={p.x}
                cy={p.y}
                r={radius}
                fill={!isMystery ? "url(#tmNode)" : "rgba(20,20,24,0.9)"}
                stroke={
                  isFinale
                    ? "#ffd76a"
                    : isCurrent
                      ? "#ff4d4d"
                      : isNext
                        ? "rgba(255,77,77,0.6)"
                        : "rgba(255,255,255,0.12)"
                }
                strokeWidth={isFinale || isCurrent ? 2.5 : 1.5}
              />

              {reward ? (
                <g
                  transform={`translate(${p.x - 9}, ${p.y - 9})`}
                  color={isNext ? "#ffb3b3" : "#ffffff"}
                  opacity={isNext ? 0.7 : 1}
                >
                  <RewardGlyph type={reward.type} size={18} />
                </g>
              ) : (
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  fill="#6b6b6b"
                >
                  ?
                </text>
              )}

              {isFinale && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={radius + 4}
                  fill="none"
                  stroke="rgba(255,215,106,0.4)"
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Today's task card */}
      <div style={styles.taskCard}>
        {task ? (
          <>
            <div style={styles.taskTitleRow}>
              <div style={styles.taskLabel}>TODAY'S TASK</div>
              {task.is_completed && (
                <div style={styles.doneBadge}>Completed</div>
              )}
            </div>

            <h1 style={styles.taskTitle}>{task.title}</h1>
            <p style={styles.taskDescription}>{task.description}</p>

            {!task.is_completed && (
              <button
                style={styles.completeBtn}
                onClick={handleComplete}
                disabled={completing}
              >
                {completing ? "Moving…" : "Complete"}
              </button>
            )}
          </>
        ) : (
          <p style={styles.taskDescription}>
            Your next task is being prepared. Check back in a moment.
          </p>
        )}
      </div>

      {/* Reward preview modal */}
      {previewOpen && nextPreview && map?.next_node_preview && (
        <div style={styles.modalBackdrop} onClick={() => setPreviewOpen(false)}>
          <div
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalIcon}>
              <RewardGlyph type={map.next_node_preview.type} size={40} />
            </div>
            <h2 style={styles.modalTitle}>{nextPreview.label}</h2>
            <p style={styles.modalSub}>{nextPreview.sublabel}</p>
            <p style={styles.modalHint}>Complete today's task to move closer</p>
            <button
              style={styles.modalClose}
              onClick={() => setPreviewOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tmPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.25); }
        }
        .tm-pulse {
          transform-box: fill-box;
          transform-origin: center;
          animation: tmPulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: 357,
    borderRadius: 24,
    padding: "20px 22px 26px 22px",
    boxSizing: "border-box",
    background: "rgba(255, 255, 255, 0.02)",
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
    border: "none",
    boxShadow:
      "0 15px 35px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(0, 0, 0, 0.2)",
    margin: "0 auto",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 6,
  },

  eyebrow: {
    color: "#ff4d4d",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },

  spacesCount: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1,
    marginTop: 4,
  },

  previewChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,77,77,0.08)",
    border: "1px solid rgba(255,77,77,0.35)",
    borderRadius: 999,
    padding: "6px 14px 6px 10px",
    cursor: "pointer",
    color: "#ffffff",
    boxSizing: "border-box",
  },

  chipIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffb3b3",
  },

  chipLabel: {
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  },

  taskCard: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },

  taskTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },

  taskLabel: {
    color: "#9F9F9F",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
  },

  doneBadge: {
    color: "#7CB342",
    fontSize: 12,
    fontWeight: 700,
  },

  taskTitle: {
    color: "#ffffff",
    fontSize: 20,
    margin: "6px 0 4px 0",
  },

  taskDescription: {
    color: "#cfcfcf",
    fontSize: 13,
    lineHeight: 1.5,
    margin: "0 0 12px 0",
  },

  completeBtn: {
    width: "100%",
    height: 40,
    background:
      "var(--glossy-pill-bg, linear-gradient(135deg, rgba(120,10,10,0.9) 0%, rgba(40,4,4,0.95) 100%))",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid var(--glossy-pill-border, rgba(255,59,48,0.5))",
    borderRadius: 20,
    boxShadow: "var(--glossy-pill-shadow, none)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 24,
  },

  modalCard: {
    width: 300,
    borderRadius: 24,
    padding: "28px 24px 22px 24px",
    boxSizing: "border-box",
    background: "rgba(30, 12, 12, 0.92)",
    border: "1px solid rgba(255,77,77,0.3)",
    boxShadow:
      "0 20px 45px rgba(0, 0, 0, 0.6), 0 0 40px rgba(200,0,0,0.2)",
    textAlign: "center" as const,
  },

  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    margin: "0 auto 14px auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at 50% 40%, rgba(255,77,77,0.25) 0%, rgba(0,0,0,0.2) 100%)",
    border: "1px solid rgba(255,77,77,0.4)",
    color: "#ff8a7a",
  },

  modalTitle: {
    color: "#ffffff",
    fontSize: 20,
    margin: 0,
  },

  modalSub: {
    color: "#9F9F9F",
    fontSize: 13,
    margin: "4px 0 14px 0",
  },

  modalHint: {
    color: "#ffb3b3",
    fontSize: 13,
    margin: "0 0 18px 0",
  },

  modalClose: {
    width: "100%",
    height: 40,
    background: "var(--glossy-pill-bg, rgba(120,10,10,0.9))",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid var(--glossy-pill-border, rgba(255,59,48,0.5))",
    borderRadius: 20,
  },
};

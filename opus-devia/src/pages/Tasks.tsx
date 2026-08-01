import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/home/BottomNav";
import QuestPriorityTask from "../components/tasks/QuestPriorityTask";
import QuestChallengeCard from "../components/tasks/QuestChallengeCard";
import lv1_10 from "../assets/badges/lv_1_10.svg";
import lv10_20 from "../assets/badges/lv_10_20.svg";
import lv20_30 from "../assets/badges/lv_20_30.svg";
import lv30_40 from "../assets/badges/lv_30_40.svg";
import lv40_50 from "../assets/badges/lv_40_50.svg";
import lv50_60 from "../assets/badges/lv_50_60.svg";
import lv70_80 from "../assets/badges/lv_70_80.svg";
import lv80_99 from "../assets/badges/lv_80_99.svg";
import lv100 from "../assets/badges/lv_100.svg";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const TIER_XP_CAPS: Record<string, number> = {
  free: 500,
  builder: 1500,
  operator: 4000,
  founder: 10000,
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  xp_reward: number;
  status: string;
  order_index: number;
}

interface PriorityTaskData {
  taskId: string;
  title: string;
  description: string;
  estimatedHours: number;
  xpReward: number;
}

/* ------------------------------------------------------------------ */
/*  Badge Helpers                                                      */
/* ------------------------------------------------------------------ */

function getBadgeByLevel(level: number): string {
  if (level >= 100) return lv100;
  if (level >= 80) return lv80_99;
  if (level >= 70) return lv70_80;
  if (level >= 60) return lv50_60;
  if (level >= 50) return lv50_60;
  if (level >= 40) return lv40_50;
  if (level >= 30) return lv30_40;
  if (level >= 20) return lv20_30;
  if (level >= 10) return lv10_20;
  return lv1_10;
}

function getBadgeGlow(level: number): string {
  if (level >= 100) return "0 0 60px rgba(255,69,0,0.7), 0 0 120px rgba(255,0,0,0.4)";
  if (level >= 80) return "0 0 45px rgba(224,176,255,0.6), 0 0 90px rgba(128,0,128,0.3)";
  if (level >= 70) return "0 0 35px rgba(224,176,255,0.5), 0 0 70px rgba(128,0,128,0.25)";
  if (level >= 50) return "0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(184,134,11,0.3)";
  if (level >= 40) return "0 0 25px rgba(255,215,0,0.4), 0 0 50px rgba(184,134,11,0.2)";
  if (level >= 30) return "0 0 20px rgba(192,192,192,0.4), 0 0 40px rgba(112,112,112,0.2)";
  if (level >= 20) return "0 0 18px rgba(192,192,192,0.35), 0 0 35px rgba(112,112,112,0.18)";
  if (level >= 10) return "0 0 15px rgba(205,127,50,0.35), 0 0 30px rgba(139,69,19,0.18)";
  return "0 0 12px rgba(205,127,50,0.3), 0 0 24px rgba(139,69,19,0.15)";
}

/* ------------------------------------------------------------------ */
/*  Priority Task Fetcher                                              */
/* ------------------------------------------------------------------ */

async function fetchPriorityTask(
  userId: string,
): Promise<PriorityTaskData | null> {
  // 1. Get active roadmap
  const { data: roadmap, error: roadmapErr } = await supabase
    .from("roadmaps")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (roadmapErr || !roadmap) {
    console.warn("No active roadmap for priority task");
    return null;
  }

  // 2. Get first incomplete phase
  const { data: phases } = await supabase
    .from("roadmap_phases")
    .select("id, phase_order")
    .eq("roadmap_id", roadmap.id)
    .eq("is_completed", false)
    .order("phase_order", { ascending: true })
    .limit(1);

  if (!phases || phases.length === 0) {
    console.warn("No incomplete phases in active roadmap");
    return null;
  }

  // 3. Get first incomplete task (by order_index) in that phase
  const { data: tasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("id, title, description, estimated_hours, xp_reward, status, order_index")
    .eq("roadmap_phase_id", phases[0].id)
    .eq("is_completed", false)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(1);

  if (tasksErr) {
    console.error("Failed to fetch priority task:", tasksErr);
    return null;
  }

  if (!tasks || tasks.length === 0) {
    console.warn("No pending tasks in current phase");
    return null;
  }

  const t: TaskRow = tasks[0] as TaskRow;
  return {
    taskId: t.id,
    title: t.title,
    description: t.description ?? "",
    estimatedHours: t.estimated_hours ?? 1,
    xpReward: t.xp_reward ?? 50,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Tasks() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;

  const displayName = profile?.display_name ?? 'User';
  const tier = profile?.tier ?? 'free';
  const xpCap = TIER_XP_CAPS[tier] ?? TIER_XP_CAPS.free;

  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const [priorityTask, setPriorityTask] = useState<PriorityTaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingTask, setStartingTask] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const [xpRes, task] = await Promise.all([
          supabase
            .from("user_xp")
            .select("earned")
            .eq("user_id", userId)
            .single(),
          fetchPriorityTask(userId),
        ]);

        if (cancelled) return;

        if (xpRes.data) {
          setEarnedXp(xpRes.data.earned ?? 0);
        }
        if (task) setPriorityTask(task);
      } catch (err) {
        console.error("Tasks page fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refresh();

    const handleXpUpdated = () => {
      refresh();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("user_xp_updated", handleXpUpdated);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("user_xp_updated", handleXpUpdated);
      }
    };
  }, [userId]);

  const level = useMemo(() => {
    if (earnedXp === null) return 1;
    return Math.max(1, Math.floor(earnedXp / 100));
  }, [earnedXp]);

  const badgeSvg = useMemo(() => getBadgeByLevel(level), [level]);
  const glow = useMemo(() => getBadgeGlow(level), [level]);

  const handleStartTask = useCallback(
    async (taskId: string) => {
      if (!userId) return;
      setStartingTask(true);
      try {
        const { error } = await supabase
          .from("tasks")
          .update({ status: "in_progress" })
          .eq("id", taskId)
          .eq("user_id", userId);

        if (error) {
          console.error("Failed to start task:", error);
          return;
        }

        // Refresh the priority task list to reflect the change
        const updatedTask = await fetchPriorityTask(userId);
        setPriorityTask(updatedTask);
      } catch (err) {
        console.error("Error starting task:", err);
      } finally {
        setStartingTask(false);
      }
    },
    [userId],
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.userInfo}>
        <h2 style={styles.userName}>{displayName}</h2>
        <span style={styles.statusDot} />
        <button
          style={styles.settingsBtn}
          aria-label="Settings"
          onClick={() => {}}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Badge */}
      <section style={styles.badgeStatus}>
        {loading ? (
          <div
            style={{
              width: 175,
              height: 175,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.03)",
            }}
          />
        ) : (
          <div
            style={{
              width: 175,
              height: 175,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)",
              boxShadow: glow,
              transition: "box-shadow 0.3s ease",
            }}
          >
            <img
              src={badgeSvg}
              alt={`Level ${level} badge`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                mixBlendMode: "screen",
              }}
            />
          </div>
        )}
      </section>

      {/* Level & XP Info */}
      <div style={styles.lvlInfo}>
        {loading ? (
          <>
            <div
              style={{
                height: 24,
                width: 80,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 6,
                margin: "0 auto",
              }}
            />
            <div
              style={{
                height: 14,
                width: 120,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 4,
                marginTop: 8,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            />
          </>
        ) : (
          <>
            <h1 style={styles.lvStatus}>LV. {level}</h1>
            <p style={styles.xpStatus}>
              {earnedXp ?? "--"} / {xpCap} XP
            </p>
          </>
        )}
      </div>

      {/* Priority Task Card */}
      <QuestPriorityTask
        task={priorityTask}
        loading={loading || startingTask}
        onStart={handleStartTask}
      />

      {/* Challenge Card (static placeholder) */}
      <QuestChallengeCard />

      {/* Talk to Mentor button */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <button
          style={{
            padding: "12px 28px",
            borderRadius: 999,
            border: "1px solid var(--glossy-pill-border, var(--theme-accent, rgba(255,59,48,0.5)))",
            cursor: "pointer",
            background: "var(--glossy-pill-bg, var(--pill-bg, linear-gradient(135deg, rgba(120,10,10,0.9) 0%, rgba(40,4,4,0.95) 100%)))",
            boxShadow: "var(--glossy-pill-shadow, 0 0 20px var(--theme-accent-glow, rgba(200,0,0,0.3)), 0 0 40px var(--theme-accent-glow, rgba(200,0,0,0.15)), 0 4px 12px rgba(0,0,0,0.4))",
            display: "flex",
            alignItems: "center",
            gap: 10,
            overflow: "hidden",
            animation: "chatPillPulse 2s ease-in-out infinite",
          }}
          onClick={() => navigate("/mentor")}
          aria-label="Chat with Mentor"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}>
            Talk to Mentor
          </span>
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--theme-accent, #ff3b30)",
              boxShadow: "0 0 10px var(--theme-accent, #ff3b30)",
              animation: "chatPillDot 1.5s ease-in-out infinite",
            }}
          />
        </button>
      </div>

      {/* Pill pulse animation */}
      <style>{`
        @keyframes chatPillPulse {
          0%, 100% { box-shadow: 0 0 20px var(--theme-accent-glow, rgba(200,0,0,0.3)), 0 0 40px var(--theme-accent-glow, rgba(200,0,0,0.15)), 0 4px 12px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 30px var(--theme-accent-glow, rgba(200,0,0,0.5)), 0 0 60px var(--theme-accent-glow, rgba(200,0,0,0.25)), 0 4px 12px rgba(0,0,0,0.4); }
        }
        @keyframes chatPillDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles — exact values from Quest.css                               */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 402,
    width: "100%",
    minHeight: "100vh",
    background: "transparent",
    borderRadius: 10,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    overflowY: "auto",
    overflowX: "hidden",
    padding: "0px 0px 100px 0px",
    margin: "0 auto",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },

  /* Header */
  userInfo: {
    position: "absolute",
    top: 15,
    left: 0,
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "0 20px",
    boxSizing: "border-box",
    zIndex: 10,
  },
  userName: {
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 20,
    marginLeft: 10,
  },
  statusDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    backgroundColor: "var(--theme-accent, #ff4d4d)",
    borderRadius: "50%",
    flexShrink: 0,
    marginLeft: 8,
  },
  settingsBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    width: 40,
    height: 40,
    borderRadius: "50%",
  },

  /* Badge */
  badgeStatus: {
    width: 175,
    height: 175,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "20px auto 0px auto",
  },

  /* Level Info */
  lvlInfo: {
    textAlign: "center" as const,
  },
  lvStatus: {
    color: "#ffffff",
    fontSize: 24,
    marginTop: 2,
    marginBottom: 0,
  },
  xpStatus: {
    color: "#9F9F9F",
    fontSize: 14,
    letterSpacing: 2.4,
    marginTop: 8,
    marginBottom: 15,
  },

  /* Remove old floating chat button style */
  /* (replaced by glowing pill above) */

};
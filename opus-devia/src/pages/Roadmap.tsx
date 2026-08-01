import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/home/BottomNav";
import "./Roadmap.css";

/* ------------------------------------------------------------------ */
/*  Types                                                            */
/* ------------------------------------------------------------------ */

interface RoadmapTask {
  id: string;
  title: string;
  is_completed: boolean;
  description?: string | null;
  goal_description?: string | null;
  difficulty_rationale?: string | null;
  task_type?: string | null;
  difficulty?: string | null;
  difficulty_score?: number | null;
  is_major?: boolean;
  xp_reward?: number | null;
  status?: string | null;
  roadmap_phase_id?: string;
}

// ─────────────────────────────────────────
// Difficulty helpers — display color from DB difficulty label
// ─────────────────────────────────────────
function getDifficultyColor(difficulty: string | null | undefined): { bg: string; text: string; border: string; label: string } {
  const d = (difficulty ?? "").toLowerCase();
  if (d === "large") return { bg: "color-mix(in srgb, var(--theme-accent, #DC143C) 12%, transparent)", text: "var(--theme-accent, #DC143C)", border: "color-mix(in srgb, var(--theme-accent, #DC143C) 35%, transparent)", label: "Hard" };
  if (d === "medium") return { bg: "rgba(255, 215, 0, 0.12)", text: "#FFD700", border: "rgba(255, 215, 0, 0.35)", label: "Medium" };
  if (d === "small") return { bg: "rgba(135, 206, 250, 0.12)", text: "#87CEEB", border: "rgba(135, 206, 250, 0.35)", label: "Easy" };
  return { bg: "rgba(120, 120, 130, 0.12)", text: "#9898a0", border: "rgba(120, 120, 130, 0.35)", label: "—" };
}

/** Returns true if this phase should display fully with tasks. */
function isPhaseUnlocked(phase: { status: string; phase_order: number }): boolean {
  return phase.status === "active" || phase.phase_order === 1;
}

interface RoadmapPhase {
  id: string;
  title: string;
  description: string | null;
  phase_order: number;
  is_completed: boolean;
  status: string;
  tasks: RoadmapTask[];
}

interface RoadmapData {
  id: string;
  title: string;
  phases: RoadmapPhase[];
}

/* ------------------------------------------------------------------ */
/*  Nav items (same as BottomNav but self-contained)                  */
/* ------------------------------------------------------------------ */

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
// ensure NAV_ITEMS is considered used by the build (some environments flag unused consts)
void NAV_ITEMS;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Roadmap() {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<{ task: RoadmapTask; phaseTitle: string; phaseId: string } | null>(null);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState<string | null>(null);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);

  // Resolve display name: DB profile first, then auth metadata, then fallback
  const displayName =
    profile?.display_name ??
    user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "KING";

  const togglePhase = useCallback((phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  }, []);

  const fetchRoadmapRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const fetchRoadmap = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      /* ---- 1. Get the single most-recent active roadmap ---- */
      const { data: activeRoadmap, error: roadmapErr } = await supabase
        .from("roadmaps")
        .select("id, title")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (roadmapErr) {
        // No roadmap at all — show empty state
        setRoadmap(null);
        setLoading(false);
        return;
      }

      /* ---- 2. Phases + tasks via join — one query ---- */
      const { data: phases, error: phasesErr } = await supabase
        .from("roadmap_phases")
        .select("id, title, description, phase_order, is_completed, status, tasks(*)")
        .eq("roadmap_id", activeRoadmap.id)
        .order("phase_order", { ascending: true });

      if (phasesErr) {
        console.warn("Failed to fetch phases:", phasesErr.message);
      }

      /* ---- 3. Build phases — active get tasks, locked get none ---- */
      const builtPhases: RoadmapPhase[] = (phases ?? []).map((p: any) => {
        const unlocked = isPhaseUnlocked({ status: p.status, phase_order: p.phase_order });
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          phase_order: p.phase_order,
          is_completed: p.is_completed,
          status: p.status,
          tasks: unlocked ? (p.tasks ?? []).map((t: any) => ({
            id: t.id,
            title: t.title,
            is_completed: t.is_completed,
            description: t.description,
            goal_description: t.goal_description,
            difficulty_rationale: t.difficulty_rationale,
            task_type: t.task_type,
            difficulty: t.difficulty,
            difficulty_score: t.difficulty_score,
            is_major: t.is_major,
            xp_reward: t.xp_reward,
            status: t.status,
            roadmap_phase_id: t.roadmap_phase_id,
          })) : [],
        };
      });

      setRoadmap({
        id: activeRoadmap.id,
        title: activeRoadmap.title,
        phases: builtPhases,
      });
    } catch (err) {
      console.error("Roadmap fetch failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load roadmap"
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRoadmapRef.current = fetchRoadmap
  }, [fetchRoadmap])

  useEffect(() => {
    const state = location.state as { taskId?: string } | null;
    if (state?.taskId) {
      setInitialTaskId(state.taskId);
    }
  }, [location.state]);

  useEffect(() => {
    if (!roadmap || !initialTaskId || selectedTask?.task.id === initialTaskId) return;

    for (const phase of roadmap.phases) {
      const task = phase.tasks.find((t) => t.id === initialTaskId);
      if (task) {
        setSelectedTask({ task, phaseTitle: phase.title, phaseId: phase.id });
        break;
      }
    }
  }, [roadmap, initialTaskId, selectedTask?.task.id]);

  /** Toggle a task's is_completed in DB + optimistically in local state.
   *  Also auto-completes the phase when all its tasks are done,
   *  then unlocks the next phase. */
  const handleTaskToggle = useCallback(async (taskId: string, phaseId: string) => {
    if (!roadmap || !user?.id) return;

    // Find the task and phase in current state
    const phase = roadmap.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    const task = phase.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.is_completed;
    const prevRoadmap = roadmap;

    // ── Optimistic local update ──
    const updatedPhases = roadmap.phases.map((p) => {
      if (p.id !== phaseId) return p;
      const updatedTasks = p.tasks.map((t) =>
        t.id === taskId ? { ...t, is_completed: newCompleted } : t
      );
      const allDone = updatedTasks.length > 0 && updatedTasks.every((t) => t.is_completed);
      return { ...p, tasks: updatedTasks, is_completed: allDone };
    });
    setRoadmap({ ...roadmap, phases: updatedPhases });

    // Update selectedTask if it's the same task
    setSelectedTask((prev) =>
      prev?.task.id === taskId ? { ...prev, task: { ...prev.task, is_completed: newCompleted } } : prev
    );

    if (newCompleted) {
      try {
        const { error } = await supabase.functions.invoke("roadmap-generator", {
          body: {
            action: "complete_task",
            userId: user.id,
            taskId,
            roadmapId: roadmap.id,
          },
        });

        if (error) {
          console.warn("Roadmap complete_task failed:", error.message);
          setRoadmap(prevRoadmap);
        } else {
          window.dispatchEvent(new Event("user_xp_updated"));
        }
      } catch (err) {
        console.error("Roadmap complete_task failed:", err);
        setRoadmap(prevRoadmap);
      }
    } else {
      const { error: taskErr } = await supabase
        .from("tasks")
        .update({ is_completed: false, completed_at: null, status: "active" })
        .eq("id", taskId);
      if (taskErr) console.warn("Failed to update task:", taskErr.message);
    }

    const phaseTasks = updatedPhases.find((p) => p.id === phaseId)?.tasks ?? [];
    if (phaseTasks.length > 0 && phaseTasks.every((t) => t.is_completed)) {
      const { error: phaseErr } = await supabase
        .from("roadmap_phases")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", phaseId);
      if (phaseErr) console.warn("Failed to complete phase:", phaseErr.message);

      const currentOrder = phase.phase_order;
      const nextPhase = roadmap.phases.find((p) => p.phase_order === currentOrder + 1 && p.status === "locked");
      if (nextPhase) {
        const { error: unlockErr } = await supabase
          .from("roadmap_phases")
          .update({ status: "active" })
          .eq("id", nextPhase.id);
        if (unlockErr) console.warn("Failed to unlock next phase:", unlockErr.message);
      }

      setShowCompletionAnimation(true);
      setTimeout(() => {
        setShowCompletionAnimation(false);
        if (nextPhase) {
          setShowUnlockAnimation(nextPhase.id);
          setTimeout(() => setShowUnlockAnimation(null), 3000);
        }
      }, 2200);

      setTimeout(() => fetchRoadmapRef.current(), nextPhase ? 2800 : 2200);
    } else {
      setTimeout(() => fetchRoadmapRef.current(), 800);
    }
  }, [roadmap, fetchRoadmap, user?.id]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  /* ------------------------------------------------------------------ */
  /*  Loading state                                                     */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="roadmap-page">
        <Header displayName="..." />
        <h1 className="roadmap-title">Roadmap</h1>
        <div className="roadmap-divider" />
        <div className="roadmap-status-msg">
          <div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
          <span>Loading roadmap…</span>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Error state                                                       */
  /* ------------------------------------------------------------------ */

  if (error) {
    return (
      <div className="roadmap-page">
        <Header displayName={displayName} />
        <h1 className="roadmap-title">Roadmap</h1>
        <div className="roadmap-divider" />
        <div className="roadmap-status-msg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--theme-accent, #DC143C)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button onClick={fetchRoadmap} className="roadmap-retry-btn">Retry</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Empty state (no active roadmap)                                   */
  /* ------------------------------------------------------------------ */

  if (!roadmap || roadmap.phases.length === 0) {
    return (
      <div className="roadmap-page">
        <Header displayName={displayName} />
        <h1 className="roadmap-title">Roadmap</h1>
        <div className="roadmap-divider" />
        <div className="roadmap-status-msg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>No active roadmap yet.</span>
          <Link to="/mentor" className="roadmap-retry-btn" style={{ textDecoration: "none", marginTop: 8 }}>
            Generate One
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render — timeline                                                 */
  /* ------------------------------------------------------------------ */

  const phases = roadmap.phases;
  const completedCount = phases.filter((p) => p.is_completed).length;

  return (
    <div className="roadmap-page">
      {/* Header */}
      <Header displayName={displayName} />

      {/* Title */}
      <h1 className="roadmap-title">{roadmap.title}</h1>
      <div className="roadmap-divider" />

      {/* Progress summary */}
      <p style={{
        textAlign: "center",
        marginTop: 10,
        fontSize: 11,
        color: "#7b7f88",
        fontWeight: 500,
        letterSpacing: "0.04em",
      }}>
        {completedCount} / {phases.length} phases complete
      </p>

      {/* Timeline */}
      <ul className="roadmap-timeline">
        {phases.map((phase, index) => {
          const isLeft = index % 2 === 0;
          const isLast = index === phases.length - 1;
          const locked = !isPhaseUnlocked({ status: phase.status, phase_order: phase.phase_order });

          // Derive node class
          let nodeClass = "roadmap-node";
          nodeClass += isLeft ? " left" : " right";
          if (isLast) nodeClass += " last-node";
          if (locked) nodeClass += " locked-phase";
          if (showUnlockAnimation === phase.id) nodeClass += " unlocking";

          const circleClass = `roadmap-node-circle ${phase.is_completed ? "completed" : locked ? "locked" : "pending"}`;

          const isExpanded = expandedPhases.has(phase.id);
          const taskCount = phase.tasks.length;
          const completedTaskCount = phase.tasks.filter((t) => t.is_completed).length;

          return (
            <li key={phase.id} className={nodeClass}>
              {/* Circle */}
              <div className={circleClass} />

              {/* Phase button + task list wrapper */}
              <div
                className={`roadmap-node-body${isLeft ? " body-left" : " body-right"}${isLast ? " body-last" : ""}${locked ? " body-locked" : ""}`}
              >
                {locked ? (
                  /* Locked phase card — not expandable */
                  <div className="roadmap-node-btn locked-card" title={phase.description ?? "Complete previous phase to unlock"}>
                    <span className="roadmap-lock-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    {phase.title}
                  </div>
                ) : (
                  <>
                    <button
                      className="roadmap-node-btn"
                      onClick={() => togglePhase(phase.id)}
                      title={phase.description ?? undefined}
                    >
                      {phase.title}
                      <span className={`arrow${isExpanded ? " expanded" : ""}`}>
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    </button>

                    {/* Task count pill */}
                    <span className="roadmap-task-count">
                      {completedTaskCount}/{taskCount} tasks
                    </span>

                    {/* Expandable task list */}
                    <div
                      className="roadmap-task-list"
                      style={{
                        maxHeight: isExpanded ? "600px" : "0px",
                        opacity: isExpanded ? 1 : 0,
                        marginTop: isExpanded ? 6 : 0,
                        overflow: "hidden",
                      }}
                    >
                      <div className="roadmap-task-list-inner">
                        {phase.tasks.map((task) => {
                          const dc = getDifficultyColor(task.difficulty);
                          const scoreLabel = task.difficulty_score != null ? `${task.difficulty_score}/5` : "";
                          return (
                            <div
                              key={task.id}
                              className={`roadmap-task-item${task.is_completed ? " done" : ""}`}
                              onClick={() => setSelectedTask({ task, phaseTitle: phase.title, phaseId: phase.id })}
                              style={{ borderColor: dc.border }}
                            >
                              <span className={`roadmap-task-check${task.is_completed ? " checked" : ""}`}>
                                {task.is_completed ? "✓" : "○"}
                              </span>
                              <span className="roadmap-task-title">{task.title}</span>
                              <span
                                className="roadmap-task-diff-badge"
                                style={{ background: dc.bg, color: dc.text }}
                                title={scoreLabel ? `Score: ${scoreLabel}` : undefined}
                              >
                                {dc.label}{scoreLabel ? ` · ${scoreLabel}` : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── Animation keyframes ── */}
      <style>{`
        @keyframes phaseCompleteCheckDraw {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes phaseCompleteFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes phaseCompleteOverlayFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes unlockShake {
          0%, 100% { transform: translateX(0); }
          15%      { transform: translateX(-6px); }
          35%      { transform: translateX(6px); }
          55%      { transform: translateX(-4px); }
          75%      { transform: translateX(4px); }
          90%      { transform: translateX(-2px); }
        }
        @keyframes unlockGlowPulse {
          0%   { box-shadow: 0 0 0px transparent; }
          50%  { box-shadow: 0 0 20px var(--theme-accent-glow, rgba(154,0,0,0.6)); }
          100% { box-shadow: 0 0 0px transparent; }
        }
        @keyframes unlockTitleFade {
          from { color: #A8A8A8; }
          to   { color: #ffffff; }
        }
        .roadmap-node.unlocking .roadmap-node-body.body-locked {
          animation: unlockShake 400ms ease-out, unlockGlowPulse 800ms ease-out 400ms;
          background: #1a1d27;
          opacity: 1;
        }
        .roadmap-node.unlocking .locked-card {
          animation: unlockTitleFade 300ms ease-out forwards;
        }
        .roadmap-node.unlocking .roadmap-lock-icon {
          animation: lockIconDissolve 300ms ease-out forwards;
        }
        @keyframes lockIconDissolve {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      {/* ── Phase completion overlay ── */}
      {showCompletionAnimation && (
        <div className="phase-complete-overlay">
          <div className="phase-complete-content">
            <svg
              width="80" height="80" viewBox="0 0 24 24"
              fill="none" stroke="var(--theme-accent, #9a0000)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: 60,
                strokeDashoffset: 60,
                animation: "phaseCompleteCheckDraw 600ms ease-out forwards",
              }}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2 style={{
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 700,
              marginTop: 20,
              opacity: 0,
              animation: "phaseCompleteFadeIn 500ms ease-out 400ms forwards",
            }}>Phase Complete</h2>
            <p style={{
              color: "#ef9f27",
              fontSize: 16,
              fontWeight: 600,
              marginTop: 8,
              opacity: 0,
              animation: "phaseCompleteFadeIn 500ms ease-out 600ms forwards",
            }}>
              +{roadmap.phases.find(p => p.is_completed)?.tasks.reduce((s, t) => s + (t.xp_reward ?? 0), 0) ?? 0} XP earned
            </p>
          </div>
        </div>
      )}

      {/* Floating Mentor button */}
      <Link to="/mentor" className="roadmap-floating-mentor" aria-label="Talk to Mentor">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </Link>

      {/* Bottom Nav */}
      <BottomNav />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask.task}
          phaseTitle={selectedTask.phaseTitle}
          phaseId={selectedTask.phaseId}
          onClose={() => setSelectedTask(null)}
          onToggleComplete={handleTaskToggle}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Header({ displayName }: { displayName: string }) {
  return (
    <div className="roadmap-header">
      <div className="roadmap-header-left">
        <span className="roadmap-username">{displayName}</span>
        <span className="roadmap-status-dot" />
      </div>
      <Link to="/profile" className="roadmap-settings-btn" aria-label="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Task Detail Modal                                                  */
/* ------------------------------------------------------------------ */

function TaskDetailModal({
  task,
  phaseTitle,
  phaseId,
  onClose,
  onToggleComplete,
}: {
  task: RoadmapTask;
  phaseTitle: string;
  phaseId: string;
  onClose: () => void;
  onToggleComplete: (taskId: string, phaseId: string) => void;
}) {
  const dc = getDifficultyColor(task.difficulty);
  const goalText = task.goal_description?.trim() || "No difficulty breakdown available.";
  const rationaleText = task.difficulty_rationale?.trim() || "No difficulty breakdown available.";

  const typeLabel =
    task.task_type
      ? task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)
      : null;

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle / close bar */}
        <div className="task-modal-handle-row">
          <div className="task-modal-handle" />
          <button className="task-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h2 className="task-modal-title">{task.title}</h2>
        {phaseTitle && <div className="task-modal-synthetic-tag">{phaseTitle}</div>}

        {/* Description */}
        <p className="task-modal-desc">
          {task.description || "No description provided for this task."}
        </p>

        {/* Meta badges */}
        <div className="task-modal-meta">
          <span
            className="task-modal-badge task-diff-badge"
            style={{ background: dc.bg, color: dc.text, borderColor: dc.border }}
          >
            {dc.label}
            {task.difficulty_score != null ? ` · ${task.difficulty_score}/5` : ""}
          </span>
          {typeLabel && (
            <span className="task-modal-badge task-type-badge">{typeLabel}</span>
          )}
          {task.xp_reward != null && (
            <span className="task-modal-badge task-xp-badge">
              +{task.xp_reward} XP
            </span>
          )}
          {task.is_completed && (
            <span className="task-modal-badge task-done-badge">Completed</span>
          )}
        </div>

        {/* Goal section */}
        <div className="task-modal-section">
          <h3 className="task-modal-section-heading">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Why This Task Matters
          </h3>
          <p className="task-modal-section-text">{goalText}</p>
        </div>

        {/* Difficulty rationale */}
        <div className="task-modal-section">
          <h3 className="task-modal-section-heading">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Difficulty Breakdown
          </h3>
          <p className="task-modal-section-text">{rationaleText}</p>
        </div>

        {/* Complete / Undo toggle button */}
        <button
          className={`task-modal-complete-btn${task.is_completed ? " completed" : ""}`}
          onClick={() => onToggleComplete(task.id, phaseId)}
        >
          {task.is_completed ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Mark Incomplete
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Mark Complete
            </>
          )}
        </button>
      </div>
    </div>
  );
}

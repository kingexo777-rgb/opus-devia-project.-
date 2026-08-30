import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import "../../pages/Roadmap.css";

interface PriorityTaskData {
  id: string;
  title: string;
  description: string | null;
  goal_description?: string | null;
  difficulty_rationale?: string | null;
  task_type?: string | null;
  difficulty?: string | null;
  estimated_hours?: number | null;
  xp_reward: number;
}

interface PriorityTaskProps {
  task: PriorityTaskData | null;
  loading: boolean;
}

export default function PriorityTask({ task, loading }: PriorityTaskProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [detailOpen, setDetailOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const difficultyLabel = task?.difficulty
    ? task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)
    : undefined;

  const openTaskDetails = useCallback(async () => {
    if (!task) return;
    if (user?.id) {
      setStarting(true);
      const { error } = await supabase
        .from("tasks")
        .update({ status: "in_progress" })
        .eq("id", task.id)
        .eq("user_id", user.id);
      if (error) console.warn("Failed to mark task in progress:", error.message);
      setStarting(false);
    }
    setDetailOpen(true);
  }, [task, user?.id]);

  const handleSubmitProof = useCallback(() => {
    if (!task) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "mentor_task_proof_prompt",
        JSON.stringify({
          title: task.title,
          description: task.description ?? "",
          xpReward: task.xp_reward,
        })
      );
    }
    navigate("/mentor");
  }, [navigate, task]);

  /* LOADING STATE */
  if (loading) {
    return (
      <div>
        <div className="priority-task" style={{ minHeight: 80, opacity: 0.6 }} />
      </div>
    );
  }

  /* NO TASKS LEFT */
  if (!task) {
    return (
      <div>
        <div className="priority-task" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--theme-accent, #9a0000)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span style={{ color: "rgba(255,255,255,0.52)", fontSize: 10, fontWeight: 500 }}>All tasks complete</span>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9 }}>Great work! Check back for new tasks.</span>
        </div>
      </div>
    );
  }

  /* MAIN TASK CARD */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* PRIMARY TASK */}
      <div className="priority-task">
        {/* Top row — title + button */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#F5F5F5", lineHeight: 1.25, margin: 0, flex: 1 }}>
            {task.title}
          </h3>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openTaskDetails(); }}
            style={{
              flexShrink: 0,
              background: "var(--glossy-pill-bg, var(--theme-accent, #9a0000))",
              color: "#fff",
              border: "1px solid var(--glossy-pill-border, transparent)",
              borderRadius: 999,
              padding: "8px 18px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              boxShadow: "var(--glossy-pill-shadow, none)",
              whiteSpace: "nowrap",
            }}
          >
            {starting ? "Opening..." : "Start"}
          </button>
        </div>

        {/* Type label */}
        <p style={{ color: "var(--theme-accent, #9a0000)", fontSize: 11, fontWeight: 600, margin: "0 0 12px" }}>
          Priority task
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 12 }} />

        {/* Meta pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {task.estimated_hours && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "5px 12px", fontSize: 12, color: "#C7C9D1" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C7C9D1" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {task.estimated_hours}hr{task.estimated_hours !== 1 ? "s" : ""}
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "5px 12px", fontSize: 12, color: "#C7C9D1" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C7C9D1" strokeWidth="2" strokeLinecap="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            {task.xp_reward.toLocaleString()} XP
          </span>
        </div>
      </div>

      {/* CHALLENGE CARD */}
      <div className="priority-task" style={{ opacity: 0.75 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#F5F5F5", lineHeight: 1.25, margin: 0, flex: 1 }}>
            Coming Soon
          </h3>
          <button
            type="button"
            disabled
            style={{ flexShrink: 0, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "8px 18px", fontWeight: 700, fontSize: 12, cursor: "not-allowed", whiteSpace: "nowrap" }}
          >
            Locked
          </button>
        </div>

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600, margin: "0 0 12px" }}>
          Challenge
        </p>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 12 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", borderRadius: 999, padding: "5px 12px", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            --
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", borderRadius: 999, padding: "5px 12px", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            -- XP
          </span>
        </div>
      </div>

      {/* TASK DETAILS MODAL */}
      {detailOpen && (
        <div className="task-modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="task-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-handle-row">
              <div className="task-modal-handle" />
              <button className="task-modal-close" onClick={() => setDetailOpen(false)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <h2 className="task-modal-title">{task.title}</h2>
            <p className="task-modal-desc">{task.description || "No description provided."}</p>
            <div className="task-modal-meta">
              {task.difficulty && <span className="task-modal-badge task-type-badge">{difficultyLabel}</span>}
              {task.task_type && <span className="task-modal-badge task-type-badge">{task.task_type}</span>}
              <span className="task-modal-badge task-xp-badge">+{task.xp_reward.toLocaleString()} XP</span>
            </div>
            <button className="task-modal-complete-btn" onClick={handleSubmitProof}>
              Submit proof of completion
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
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

  const handleViewTask = useCallback(() => {
    if (!task) return;
    navigate("/roadmap", { state: { taskId: task.id } });
  }, [navigate, task]);

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
      if (error) {
        console.warn("Failed to mark task in progress:", error.message);
      }
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

  if (loading) {
    return (
      <div style={{ margin: "0 12px" }}>
        <div className="card-glass" style={{ padding: "6px 10px", marginTop: 2, minHeight: 64, opacity: 0.6 }} />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ margin: "0 10px" }}>
        <div className="card-glass" style={{
          padding: "8px 10px 6px", marginTop: 2,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4
        }}>
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

  return (
    <div style={{ margin: "0 10px" }}>
      <div
        role="button"
        onClick={handleViewTask}
        style={{ padding: "6px 10px", marginTop: 2, cursor: task ? "pointer" : "default" }}
      >
        <div className="card-glass" style={{ padding: "10px 12px" }}>
          <p style={{ color: "var(--theme-accent, #9a0000)", fontSize: 10, fontWeight: 500, margin: 0 }}>Priority Task</p>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: 14, fontWeight: 800, margin: 0,
                color: "#F5F5F5", lineHeight: 1.3
              }}>
                {task.title}
              </h3>
              <p style={{ color: "#A8A8A8", fontSize: 11, lineHeight: 1.4, margin: "8px 0 0" }}>
                {task.description
                  ? task.description.slice(0, 70) + (task.description.length > 70 ? "..." : "")
                  : "Finish this priority task and submit proof when complete."}
              </p>
            </div>

            <div style={{ textAlign: "right", minWidth: 90 }}>
              <span style={{ display: "block", fontSize: 10, color: "#A8A8A8", marginBottom: 6 }}>
                {difficultyLabel ?? "Focused work"}
              </span>
              <strong style={{ fontSize: 12, color: "#F5F5F5" }}>+{task.xp_reward.toLocaleString()} XP</strong>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openTaskDetails();
              }}
              style={{
                background: "var(--glossy-pill-bg, var(--theme-accent, #9a0000))",
                color: "#fff", border: "1px solid var(--glossy-pill-border, transparent)", borderRadius: 999,
                padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer",
                boxShadow: "var(--glossy-pill-shadow, none)",
                minWidth: 100, flex: "0 0 auto"
              }}
            >
              {starting ? "Opening..." : "Start Task"}
            </button>
          </div>
        </div>
      </div>

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
            <p className="task-modal-desc">{task.description || "No description provided for this task."}</p>
            <div className="task-modal-meta">
              {task.difficulty && (
                <span className="task-modal-badge task-type-badge">{difficultyLabel ?? task.difficulty}</span>
              )}
              {task.task_type && (
                <span className="task-modal-badge task-type-badge">{task.task_type}</span>
              )}
              <span className="task-modal-badge task-xp-badge">+{task.xp_reward.toLocaleString()} XP</span>
            </div>
            <div className="task-modal-section">
              <h3 className="task-modal-section-heading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                What to deliver
              </h3>
              <p className="task-modal-section-text">
                {task.description || "Describe the work you will deliver, then return with proof of completion."}
              </p>
            </div>
            {(task.goal_description || task.difficulty_rationale) && (
              <div className="task-modal-section">
                <h3 className="task-modal-section-heading">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20l9-5-9-5-9 5 9 5z" />
                    <path d="M12 12l9-5-9-5-9 5 9 5z" opacity="0.3" />
                  </svg>
                  Why it matters
                </h3>
                <p className="task-modal-section-text">
                  {task.goal_description || task.difficulty_rationale || "This task moves your roadmap forward and makes your next milestone easier to unlock."}
                </p>
              </div>
            )}
            <div className="task-modal-section">
              <h3 className="task-modal-section-heading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                How to complete it
              </h3>
              <p className="task-modal-section-text">
                {task.description
                  ? `Start by working through this task step-by-step, then capture a short proof of completion and submit it to your mentor.`
                  : "Complete the task in a way that shows the result clearly, then share proof in the mentor chat."}
              </p>
            </div>
            <button
              className="task-modal-complete-btn"
              onClick={handleSubmitProof}
            >
              Submit proof of completion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
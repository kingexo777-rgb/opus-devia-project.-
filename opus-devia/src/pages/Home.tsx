import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

import Header from "../components/home/Header";
import LevelHero from "../components/home/LevelHero";
import StreakPill from "../components/home/StreakPill";
import PriorityTask from "../components/home/PriorityTask";
import RoadmapBar from "../components/home/RoadmapBar";
import MentorButton from "../components/home/MentorButton";
import TaskSectionHeader from "../components/home/TaskSectionHeader";
import BottomNav from "../components/home/BottomNav";

/* ------------------------------------------------------------------ */
/*  Types                                                            */
/* ------------------------------------------------------------------ */

interface HomeData {
  displayName: string;
  earnedXP: number;
  totalXP: number;
  level: number;
  archetype: string | null;
  streakCount: number;
  weeklyDays: boolean[];
  priorityTask: PriorityTaskData | null;
  roadmapCompletion: number;
}

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Calculate level: every 100 XP = 1 level (min level 1) */
function calcLevel(earnedXP: number): number {
  return Math.max(1, Math.floor(earnedXP / 100));
}

/** Derive Mon–Sun booleans for current week from last_activity_date */
function deriveWeeklyDays(lastActivityDate: string | null): boolean[] {
  const days: boolean[] = [false, false, false, false, false, false, false];
  if (!lastActivityDate) return days;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  // Monday of current week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const lastDate = new Date(lastActivityDate);
  lastDate.setHours(0, 0, 0, 0);

  // Mark days up to and including last_activity_date
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days[i] = day <= lastDate;
  }

  return days;
}

/** Compute a default XP reward based on heuristics — schema has no xp_reward column */
function estimateTaskXP(_title: string, description: string | null): number {
  const len = description?.length ?? 0;
  if (len > 200) return 150;
  if (len > 100) return 100;
  return 50;
}

// reference helper to avoid unused-declaration build errors
void estimateTaskXP;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HomeData>({
    displayName: "",
    earnedXP: 0,
    totalXP: 0,
    level: 1,
    archetype: null,
    streakCount: 0,
    weeklyDays: [false, false, false, false, false, false, false],
    priorityTask: null,
    roadmapCompletion: 0,
  });

  const fetchHomeData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      /* ---- 1. User profile ---- */
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (userErr && userErr.code !== "PGRST116") {
        console.warn("Failed to fetch user:", userErr.message);
      }

      /* ---- 2. XP ---- */
      const { data: xpRow, error: xpErr } = await supabase
        .from("user_xp")
        .select("earned, purchased, rollover, reserved_xp")
        .eq("user_id", user.id)
        .single();

      if (xpErr && xpErr.code !== "PGRST116") {
        console.warn("Failed to fetch XP:", xpErr.message);
      }

      const earned = xpRow?.earned ?? 0;
      const total = earned + (xpRow?.purchased ?? 0) + (xpRow?.rollover ?? 0);
      const level = calcLevel(earned);

      /* ---- 3. Streak ---- */
      const { data: streakRow, error: streakErr } = await supabase
        .from("user_streaks")
        .select("current_count, last_activity_date")
        .eq("user_id", user.id)
        .eq("streak_type", "daily")
        .maybeSingle();

      if (streakErr) {
        console.warn("Failed to fetch streak:", streakErr.message);
      }

      const streakCount = streakRow?.current_count ?? 0;
      const weeklyDays = deriveWeeklyDays(streakRow?.last_activity_date ?? null);

      /* ---- 4. Archetype from onboarding ---- */
      let archetype: string | null = null;
      try {
        const { data: archRow } = await supabase
          .from("onboarding_responses")
          .select("response")
          .eq("user_id", user.id)
          .eq("question_key", "archetype")
          .maybeSingle();
        if (archRow?.response && typeof archRow.response === "object") {
          const resp = archRow.response as Record<string, unknown>;
          archetype = (resp.value as string) ?? (resp.archetype as string) ?? null;
        }
      } catch {
        // ignore
      }

      /* ---- 5. Priority task — active roadmap → first incomplete phase → first incomplete task ---- */
      let priorityTask: PriorityTaskData | null = null;

      const { data: activeRoadmap } = await supabase
        .from("roadmaps")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (activeRoadmap) {
        // Get phases ordered by phase_order
        const { data: phases } = await supabase
          .from("roadmap_phases")
          .select("id, phase_order")
          .eq("roadmap_id", activeRoadmap.id)
          .eq("is_completed", false)
          .order("phase_order", { ascending: true })
          .limit(1);

        if (phases && phases.length > 0) {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("id, title, description, goal_description, difficulty_rationale, task_type, difficulty, estimated_hours, xp_reward")
            .eq("roadmap_phase_id", phases[0].id)
            .eq("is_completed", false)
            .order("created_at", { ascending: true })
            .limit(1);

          if (tasks && tasks.length > 0) {
            priorityTask = {
              id: tasks[0].id,
              title: tasks[0].title,
              description: tasks[0].description,
              goal_description: tasks[0].goal_description,
              difficulty_rationale: tasks[0].difficulty_rationale,
              task_type: tasks[0].task_type,
              difficulty: tasks[0].difficulty,
              estimated_hours: tasks[0].estimated_hours,
              xp_reward: tasks[0].xp_reward,
            };
          }
        }
      }

      /* ---- 6. Roadmap completion ---- */
      let roadmapCompletion = 0;

      const { count: totalTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: completedTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_completed", true);

      if (totalTasks && totalTasks > 0) {
        roadmapCompletion = ((completedTasks ?? 0) / totalTasks) * 100;
      }

      /* ---- Assemble ---- */
      setData({
        displayName:
          userRow?.display_name ??
          user.user_metadata?.display_name ??
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "User",
        earnedXP: earned,
        totalXP: total,
        level,
        archetype,
        streakCount,
        weeklyDays,
        priorityTask,
        roadmapCompletion,
      });
    } catch (err) {
      console.error("Home data fetch failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  useEffect(() => {
    const handleXpUpdated = () => fetchHomeData();
    if (typeof window !== "undefined") {
      window.addEventListener("user_xp_updated", handleXpUpdated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("user_xp_updated", handleXpUpdated);
      }
    };
  }, [fetchHomeData]);

  /* ------------------------------------------------------------------ */
  /*  Error state                                                       */
  /* ------------------------------------------------------------------ */

  if (error) {
    return (
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <div className="w-12 h-12 rounded-full bg-crimson/20 flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--theme-accent, #DC143C)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-silver-1 text-sm text-center">{error}</p>
        <button
          onClick={fetchHomeData}
          className="px-5 py-2 rounded-lg bg-crimson text-white-soft text-sm font-semibold hover:bg-crimson-light transition-colors"
        >
          Retry
        </button>
        <BottomNav />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "transparent",
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        padding: "2px 0 70px",
      }}
    >
      {/* Header */}
      <div style={{ padding: "0 10px" }}>
        <Header
          username={data.displayName}
          earnedXP={data.earnedXP}
          totalXP={data.totalXP}
          loading={loading}
        />
      </div>

      {/* Level Hero */}
      <div className="hero">
        <LevelHero
          level={data.level}
          archetype={data.archetype}
          earnedXP={data.earnedXP}
          totalXP={data.totalXP}
          loading={loading}
        />
      </div>

      {/* Streak Pill */}
      <div className="streak-card">
        <StreakPill
          streakCount={data.streakCount}
          weeklyDays={data.weeklyDays}
          loading={loading}
        />
      </div>

      {/* Roadmap Completion */}
      <div className="roadmap-card" style={{ marginTop: 8 }}>
        <RoadmapBar
          completionPercentage={data.roadmapCompletion}
          loading={loading}
        />
      </div>

      {/* Today's Task header */}
      <TaskSectionHeader />

      {/* Priority Task Card */}
      <div className="quest-grid">
        <PriorityTask task={data.priorityTask} loading={loading} />
      </div>

      {/* Mentor Button */}
      <div className="mentor-card">
        <MentorButton />
      </div>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}

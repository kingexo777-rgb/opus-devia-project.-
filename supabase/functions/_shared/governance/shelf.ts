// supabase/functions/_shared/governance/shelf.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

// ─────────────────────────────────────────
// ASSISTANT SHELF MANAGER
// Session scoped data store
// Clears on session wrap-up
// Populated only through explicit user permission
// Pre-loaded on roadmap screen automatically
// ─────────────────────────────────────────

export interface ShelfData {
  roadmap?: any
  currentPhase?: any
  activeTasks?: any[]
  performanceMetrics?: any
  mentorSessionSummary?: any
  journalEntries?: any[]
  streakData?: any
  taskHistory?: any[]
  [key: string]: any
}

// Get current shelf contents for a session
export async function getShelf(sessionId: string): Promise<ShelfData> {
  const { data } = await supabase
    .from("sessions")
    .select("assistant_shelf")
    .eq("id", sessionId)
    .single()

  return data?.assistant_shelf ?? {}
}

// Add data to shelf after user permission granted
export async function addToShelf(
  sessionId: string,
  key: string,
  value: any
): Promise<void> {
  const currentShelf = await getShelf(sessionId)

  const updatedShelf = {
    ...currentShelf,
    [key]: value,
    last_updated: new Date().toISOString(),
  }

  await supabase
    .from("sessions")
    .update({ assistant_shelf: updatedShelf })
    .eq("id", sessionId)
}

// Clear shelf on session wrap-up
export async function clearShelf(sessionId: string): Promise<void> {
  await supabase
    .from("sessions")
    .update({ assistant_shelf: null })
    .eq("id", sessionId)
}

// Pre-load roadmap screen data automatically
// No user permission needed for their own roadmap data
// on the roadmap screen
export async function preloadRoadmapScreen(
  sessionId: string,
  userId: string
): Promise<ShelfData> {
  // Fetch roadmap data
  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single()

  if (!roadmap) return {}

  // Fetch current phase
  const { data: currentPhase } = await supabase
    .from("roadmap_phases")
    .select("*")
    .eq("roadmap_id", roadmap.id)
    .eq("status", "active")
    .single()

  // Fetch active tasks
  const { data: activeTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("due_at", { ascending: true })
    .limit(20)

  const preloaded: ShelfData = {
    roadmap,
    currentPhase: currentPhase ?? null,
    activeTasks: activeTasks ?? [],
  }

  // Write to shelf
  await supabase
    .from("sessions")
    .update({ assistant_shelf: preloaded })
    .eq("id", sessionId)

  return preloaded
}

// Pull specific data onto shelf with user permission
// Enforces journal access rules
export async function pullDataToShelf(
  sessionId: string,
  userId: string,
  dataType: string
): Promise<{ success: boolean; reason?: string }> {
  switch (dataType) {
    case "performance_metrics": {
      const { data } = await supabase
        .from("user_performance")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(4)

      await addToShelf(sessionId, "performanceMetrics", data ?? [])
      return { success: true }
    }

    case "mentor_session_summary": {
      // Summary only — never raw mentor conversation
      const { data } = await supabase
        .from("memory_session_archive")
        .select("archive_payload, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3)

      await addToShelf(sessionId, "mentorSessionSummary", data ?? [])
      return { success: true }
    }

    case "journal_entries": {
      // JOURNAL ACCESS RULE ENFORCED:
      // Only entries with assistant_access toggled on
      // Locked entries completely excluded
      const { data } = await supabase
        .from("journal_entries")
        .select("id, title, content, created_at")
        .eq("user_id", userId)
        .eq("assistant_access", true)
        .eq("is_locked", false) // Locked entries never accessible
        .order("created_at", { ascending: false })
        .limit(10)

      await addToShelf(sessionId, "journalEntries", data ?? [])
      return { success: true }
    }

    case "roadmap_details": {
      const { data: roadmap } = await supabase
        .from("roadmaps")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .single()

      const { data: phases } = await supabase
        .from("roadmap_phases")
        .select("*")
        .eq("roadmap_id", roadmap?.id)
        .order("phase_number", { ascending: true })

      await addToShelf(sessionId, "roadmap", roadmap)
      await addToShelf(sessionId, "roadmapPhases", phases ?? [])
      return { success: true }
    }

    case "streak_data": {
      const { data } = await supabase
        .from("user_streaks")
        .select("current_count, longest_count, last_activity_date")
        .eq("user_id", userId)
        .single()

      await addToShelf(sessionId, "streakData", data ?? {})
      return { success: true }
    }

    case "task_history": {
      const { data } = await supabase
        .from("tasks")
        .select("title, status, completed_at, difficulty, xp_reward")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)

      await addToShelf(sessionId, "taskHistory", data ?? [])
      return { success: true }
    }

    default:
      return { success: false, reason: "unknown_data_type" }
  }
}

// Check if data type is already on shelf
export async function isOnShelf(
  sessionId: string,
  key: string
): Promise<boolean> {
  const shelf = await getShelf(sessionId)
  return key in shelf && shelf[key] !== null && shelf[key] !== undefined
}

// supabase/functions/_shared/governance/roadmap-modifier.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

// ─────────────────────────────────────────
// ROADMAP MODIFIER
// Only triggers from mentor sessions
// Only uses three permitted data sources:
// 1. Current roadmap state
// 2. User progress data
// 3. Conversation history
// Requires explicit user confirmation
// before writing anything to database
// ─────────────────────────────────────────

export interface RoadmapProposal {
  proposalId: string
  userId: string
  sessionId: string
  reasoning: string
  currentState: any
  proposedChange: any
  changeType: "phase_adjustment" | "task_modification" | "roadmap_recalibration" | "phase_unlock"
  affectedPhases: number[]
  estimatedImpact: string
  createdAt: string
  status: "pending" | "confirmed" | "rejected"
}

// Present proposed change to frontend
// Does NOT write to database
// Returns proposal for display
export async function presentChange(
  userId: string,
  sessionId: string,
  reasoning: string,
  proposedChange: any,
  changeType: RoadmapProposal["changeType"]
): Promise<RoadmapProposal> {

  // Fetch current roadmap state — permitted data source 1
  const { data: currentRoadmap } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single()

  const { data: currentPhases } = await supabase
    .from("roadmap_phases")
    .select("*")
    .eq("roadmap_id", currentRoadmap?.id)
    .order("phase_number", { ascending: true })

  const proposal: RoadmapProposal = {
    proposalId: crypto.randomUUID(),
    userId,
    sessionId,
    reasoning,
    currentState: {
      roadmap: currentRoadmap,
      phases: currentPhases,
    },
    proposedChange,
    changeType,
    affectedPhases: proposedChange.affectedPhases ?? [],
    estimatedImpact: proposedChange.estimatedImpact ?? "Roadmap will be updated to better reflect your current progress and goals.",
    createdAt: new Date().toISOString(),
    status: "pending",
  }

  // Store proposal temporarily in session
  // Does not write to roadmap tables
  await supabase
    .from("sessions")
    .update({
      pending_roadmap_proposal: proposal,
    })
    .eq("id", sessionId)

  return proposal
}

// Confirm and apply change after user approval
// This is the ONLY function that writes to roadmap tables
// Never call this without prior user confirmation
export async function confirmChange(
  proposalId: string,
  sessionId: string,
  userId: string
): Promise<{ success: boolean; reason?: string }> {

  // Retrieve the pending proposal
  const { data: session } = await supabase
    .from("sessions")
    .select("pending_roadmap_proposal")
    .eq("id", sessionId)
    .single()

  const proposal: RoadmapProposal = session?.pending_roadmap_proposal

  if (!proposal) {
    return { success: false, reason: "no_pending_proposal" }
  }

  if (proposal.proposalId !== proposalId) {
    return { success: false, reason: "proposal_id_mismatch" }
  }

  if (proposal.userId !== userId) {
    return { success: false, reason: "user_mismatch" }
  }

  if (proposal.status !== "pending") {
    return { success: false, reason: "proposal_already_processed" }
  }

  try {
    const change = proposal.proposedChange

    // Apply the change based on type
    switch (proposal.changeType) {
      case "phase_adjustment": {
        if (change.phaseId && change.updates) {
          await supabase
            .from("roadmap_phases")
            .update(change.updates)
            .eq("id", change.phaseId)
            .eq("roadmap_id", change.roadmapId)
        }
        break
      }

      case "task_modification": {
        if (change.taskId && change.updates) {
          await supabase
            .from("tasks")
            .update(change.updates)
            .eq("id", change.taskId)
            .eq("user_id", userId)
        }
        break
      }

      case "roadmap_recalibration": {
        if (change.roadmapId && change.updates) {
          await supabase
            .from("roadmaps")
            .update({
              ...change.updates,
              updated_at: new Date().toISOString(),
            })
            .eq("id", change.roadmapId)
            .eq("user_id", userId)
        }
        break
      }

      case "phase_unlock": {
        if (change.phaseId) {
          await supabase
            .from("roadmap_phases")
            .update({
              status: "active",
              unlocked_at: new Date().toISOString(),
            })
            .eq("id", change.phaseId)
        }
        break
      }

      default:
        return { success: false, reason: "unknown_change_type" }
    }

    // Mark proposal as confirmed
    await supabase
      .from("sessions")
      .update({ pending_roadmap_proposal: null })
      .eq("id", sessionId)

    // Log modification to xp_transactions for audit trail
    await supabase.from("xp_transactions").insert({
      user_id: userId,
      transaction_type: "roadmap_modification",
      amount: 0,
      description: proposal.changeType ?? "roadmap_change",
      metadata: {
        feature: proposal.changeType,
        model_used: "MENTOR",
      },
      created_at: new Date().toISOString(),
    })

    return { success: true }

  } catch (ex) {
    console.error(`confirmChange failed for proposal ${proposalId}:`, ex)
    return { success: false, reason: "database_write_failed" }
  }
}

// Reject proposal — clears without writing
export async function rejectChange(
  sessionId: string
): Promise<void> {
  await supabase
    .from("sessions")
    .update({ pending_roadmap_proposal: null })
    .eq("id", sessionId)
}

// Get pending proposal for display
export async function getPendingProposal(
  sessionId: string
): Promise<RoadmapProposal | null> {
  const { data } = await supabase
    .from("sessions")
    .select("pending_roadmap_proposal")
    .eq("id", sessionId)
    .single()

  return data?.pending_roadmap_proposal ?? null
}

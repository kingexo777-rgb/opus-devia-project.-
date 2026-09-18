// supabase/functions/_shared/treasure-map/logic.ts
//
// Dependency-free core logic for the treasure map system, shared between the
// `roadmap-generator` edge function and the test suite. This module MUST NOT
// import Deno, the Supabase client, or any other runtime dependency so the
// same file can be executed directly by both Deno (edge function) and Node
// (tests). Keeping it shared means the tests exercise the exact production
// code, not a mirrored copy.

export type RewardType = "xp_bonus" | "xp_multiplier" | "credit_holiday" | "grand_reward"

export const TREASURE_MAP_NODE_COUNT = 15

export const SMALL_REWARDS = [
  { type: "xp_bonus", value: { amount: 10 }, weight: 45 },
  { type: "xp_bonus", value: { amount: 15 }, weight: 35 },
  { type: "xp_multiplier", value: { multiplier: 1.25, duration_days: 3 }, weight: 10 },
  { type: "credit_holiday", value: { free_feature: "mentor_message", count: 1 }, weight: 10 },
] as const

export const MEDIUM_REWARDS = [
  { type: "xp_bonus", value: { amount: 40 }, weight: 45 },
  { type: "xp_multiplier", value: { multiplier: 1.5, duration_days: 3 }, weight: 10 },
  { type: "credit_holiday", value: { free_feature: "mentor_message", count: 3 }, weight: 45 },
] as const

export const GRAND_REWARDS = [
  { type: "grand_reward", value: { amount: 150 }, weight: 45 },
  { type: "grand_reward", value: { multiplier: 2.0, duration_days: 5 }, weight: 10 },
  { type: "grand_reward", value: { free_feature: "roadmap_recalibration", count: 1 }, weight: 45 },
] as const

export function weightedPick<T extends { weight: number }>(pool: T[]): T {
  const total = pool.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of pool) {
    if (roll < item.weight) return item
    roll -= item.weight
  }
  return pool[pool.length - 1]
}

export function generateMapLayout(): Record<number, { type: RewardType; value: unknown } | null> {
  const layout: Record<number, { type: RewardType; value: unknown } | null> = {}

  for (let node = 1; node <= TREASURE_MAP_NODE_COUNT; node++) {
    if (node === 7) {
      const pool = Math.random() < 0.7 ? MEDIUM_REWARDS : SMALL_REWARDS
      layout[node] = weightedPick(pool as Array<{ type: RewardType; value: unknown; weight: number }>)
    } else if (node === TREASURE_MAP_NODE_COUNT) {
      layout[node] = weightedPick(GRAND_REWARDS as Array<{ type: RewardType; value: unknown; weight: number }>)
    } else {
      layout[node] = weightedPick(SMALL_REWARDS as Array<{ type: RewardType; value: unknown; weight: number }>)
    }
  }

  return layout
}

// Anti-spoiler boundary: the client must only ever see rewards up to
// `current_position + 1`. Nodes beyond that stay hidden entirely.
export function getVisibleMapState(map: Record<string, any> | null) {
  if (!map) return null

  const currentPosition = Number(map.current_position ?? 0)
  const rawLayout = (map.reward_layout ?? {}) as Record<string, any>
  const visibleRewards: Record<number, unknown> = {}

  for (let node = 1; node <= currentPosition; node++) {
    // Already reached — show what was claimed
    visibleRewards[node] = rawLayout[node]
  }

  const nextNode = currentPosition + 1
  if (nextNode <= TREASURE_MAP_NODE_COUNT) {
    // One node ahead — show as a preview, not yet claimed
    visibleRewards[nextNode] = rawLayout[nextNode]
  }

  return {
    ...map,
    // Never send the full layout; JSON.stringify drops this key entirely.
    reward_layout: undefined,
    visible_rewards: visibleRewards,
    next_node_preview: nextNode <= TREASURE_MAP_NODE_COUNT ? rawLayout[nextNode] ?? null : null,
  }
}

// Computes the result of moving the token forward `spaces` nodes. Returns
// the new position (clamped to the final node) and the exact list of nodes
// that were passed through (and therefore should have their reward claimed).
// This is the sibling of getVisibleMapState: together they guarantee that
// rewards are only ever *claimed* for nodes the token actually crossed, and
// only ever *revealed* one node ahead of the current position.
export function computeMovement(
  oldPosition: number,
  spaces: number
): { newPosition: number; claimedNodes: number[]; mapCompleted: boolean } {
  const safeOld = Math.max(0, Math.floor(Number(oldPosition) || 0))
  const newPosition = Math.min(safeOld + spaces, TREASURE_MAP_NODE_COUNT)

  const claimedNodes: number[] = []
  for (let node = safeOld + 1; node <= newPosition; node++) {
    claimedNodes.push(node)
  }

  return {
    newPosition,
    claimedNodes,
    mapCompleted: newPosition >= TREASURE_MAP_NODE_COUNT,
  }
}

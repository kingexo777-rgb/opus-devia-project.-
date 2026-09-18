// Treasure map core logic tests — run against the SAME module the
// `roadmap-generator` edge function imports, via Node's built-in test runner
// and native TypeScript execution. Not a mirrored copy.
//
//   npm test
//

import { test } from "node:test"
import assert from "node:assert/strict"

import {
  TREASURE_MAP_NODE_COUNT,
  SMALL_REWARDS,
  MEDIUM_REWARDS,
  GRAND_REWARDS,
  weightedPick,
  generateMapLayout,
  getVisibleMapState,
  computeMovement,
} from "../supabase/functions/_shared/treasure-map/logic.ts"

function rewardKey(reward: { type: string; value: unknown } | null | undefined) {
  if (!reward) return "<null>"
  return JSON.stringify({ type: reward.type, value: reward.value })
}

const smallSet = new Set(SMALL_REWARDS.map(rewardKey))
const mediumSet = new Set(MEDIUM_REWARDS.map(rewardKey))
const grandSet = new Set(GRAND_REWARDS.map(rewardKey))

test("generateMapLayout produces 15 valid nodes from the correct reward pools", () => {
  for (let i = 0; i < 200; i++) {
    const layout = generateMapLayout()
    const keys = Object.keys(layout).map(Number).sort((a, b) => a - b)
    const expectedKeys = Array.from({ length: TREASURE_MAP_NODE_COUNT }, (_, n) => n + 1)
    assert.deepEqual(keys, expectedKeys)

    for (const node of expectedKeys) {
      const reward = layout[node]
      assert.ok(reward, `node ${node} must have a reward`)

      if (node === TREASURE_MAP_NODE_COUNT) {
        assert.equal(reward!.type, "grand_reward")
        assert.ok(grandSet.has(rewardKey(reward)), `finale must draw from grand pool (node ${node})`)
      } else if (node === 7) {
        assert.ok(
          mediumSet.has(rewardKey(reward)) || smallSet.has(rewardKey(reward)),
          `node 7 must draw from medium or small pool`
        )
      } else {
        assert.ok(smallSet.has(rewardKey(reward)), `node ${node} must draw from small pool`)
      }
    }
  }
})

test("weightedPick honors weight boundaries", () => {
  const original = Math.random
  try {
    Math.random = () => 0
    assert.equal(weightedPick([{ id: "a", weight: 1 }, { id: "b", weight: 1 }]).id, "a")

    Math.random = () => 0.999999
    assert.equal(weightedPick([{ id: "a", weight: 1 }, { id: "b", weight: 1 }]).id, "b")
  } finally {
    Math.random = original
  }
})

function buildFullLayout() {
  const layout: Record<string, { type: string; value: { amount: number } }> = {}
  for (let node = 1; node <= TREASURE_MAP_NODE_COUNT; node++) {
    layout[node] = { type: "xp_bonus", value: { amount: node * 1000 } }
  }
  return layout
}

function buildMap(currentPosition: number) {
  return {
    id: "map-1",
    user_id: "user-1",
    current_position: currentPosition,
    reward_layout: buildFullLayout(),
    map_number: 1,
    is_active: true,
  }
}

for (const pos of [0, 1, 3, 7, 14, 15]) {
  test(`anti-spoiler: getVisibleMapState at position ${pos}`, () => {
    const state = getVisibleMapState(buildMap(pos))!
    const serialized = JSON.stringify(state)

    const expectedKeys: string[] = []
    for (let n = 1; n <= Math.min(pos + 1, TREASURE_MAP_NODE_COUNT); n++) expectedKeys.push(String(n))
    const actualKeys = Object.keys(state.visible_rewards).sort((a, b) => Number(a) - Number(b))

    assert.deepEqual(actualKeys, expectedKeys, "only nodes 1..pos+1 are visible")
    assert.ok(!serialized.includes("reward_layout"), "full reward_layout must be stripped")

    for (let n = pos + 2; n <= TREASURE_MAP_NODE_COUNT; n++) {
      assert.ok(
        !serialized.includes(`"amount":${n * 1000}`),
        `future node ${n} reward must not leak`
      )
    }

    const preview =
      pos + 1 <= TREASURE_MAP_NODE_COUNT
        ? { type: "xp_bonus", value: { amount: (pos + 1) * 1000 } }
        : null
    assert.deepEqual(state.next_node_preview, preview)
  })
}

test("getVisibleMapState(null) returns null", () => {
  assert.equal(getVisibleMapState(null), null)
})

test("computeMovement claims exactly the crossed nodes", () => {
  // Move 2 spaces from node 0 → position 2, claims nodes 1..2
  assert.deepEqual(computeMovement(0, 2), { newPosition: 2, claimedNodes: [1, 2], mapCompleted: false })

  // Move 3 spaces from node 3 → position 6, claims nodes 4..6
  assert.deepEqual(computeMovement(3, 3), { newPosition: 6, claimedNodes: [4, 5, 6], mapCompleted: false })
})

test("computeMovement clamps at the finale and marks completion", () => {
  // Moving 3 spaces from 13 would exceed 15 → clamp to 15, claims 14..15
  assert.deepEqual(computeMovement(13, 3), { newPosition: 15, claimedNodes: [14, 15], mapCompleted: true })

  // Already at the end → no new nodes, still complete
  assert.deepEqual(computeMovement(15, 2), { newPosition: 15, claimedNodes: [], mapCompleted: true })
})

test("computeMovement never claims future nodes beyond new position", () => {
  for (let old = 0; old <= 15; old++) {
    for (let spaces = 1; spaces <= 3; spaces++) {
      const m = computeMovement(old, spaces)
      assert.equal(m.newPosition, Math.min(old + spaces, 15))
      for (const node of m.claimedNodes) {
        assert.ok(node > old, `claimed node ${node} must be after ${old}`)
        assert.ok(node <= m.newPosition, `claimed node ${node} must not exceed new position ${m.newPosition}`)
      }
      // No gaps: claimed nodes must be contiguous starting at old+1
      const expected = Array.from(
        { length: Math.max(0, m.newPosition - old) },
        (_, i) => old + 1 + i
      )
      assert.deepEqual(m.claimedNodes, expected)
    }
  }
})

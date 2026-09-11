import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const ESTIMATED_XP_COST: Record<string, number> = {
  mentor_message: 5,
  assistant_message: 2,
  roadmap_assistant_message: 2,
  journal_assistant_message: 1,
  image_upload: 3,
  document_upload: 2,
  roadmap_generation: 10,
  roadmap_recalibration: 8,
  weekly_review: 6,
  daily_review: 3,
  monthly_breakdown: 10,
  voice_session_free: 40,
  voice_session_paid: 20,
  deep_research: 18,
  summarization: 0,
  memory_tagging: 0,
  journal_classification: 0,
  intent_detection: 0,
  chat_pattern_analysis: 0,
}

const XP_MULTIPLIERS: Record<string, number> = {
  free: 1,
  builder: 1.5,
  operator: 2,
  founder: 3,
}

// NEW: Grind economy constants
type PlanId = "free" | "builder" | "operator" | "founder"

interface PlanConfig {
  baseXp: number
  grindRatio: number
  imageAllowanceMonthly: number
  imageDailyAllowance: number
  voiceAllowanceMinutes: number
  assistantXpCost: number
  mentorXpCost: number
  imageOverageXpCost: number
  voiceOverageXpPerTwoMinutes: number
}

const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    baseXp: 150, grindRatio: 0.50,
    imageAllowanceMonthly: 150, imageDailyAllowance: 10,
    voiceAllowanceMinutes: 30,
    assistantXpCost: 1, mentorXpCost: 2,
    imageOverageXpCost: 5, voiceOverageXpPerTwoMinutes: 1,
  },
  builder: {
    baseXp: 225, grindRatio: 0.75,
    imageAllowanceMonthly: 300, imageDailyAllowance: 20,
    voiceAllowanceMinutes: 90,
    assistantXpCost: 1, mentorXpCost: 2,
    imageOverageXpCost: 5, voiceOverageXpPerTwoMinutes: 1,
  },
  operator: {
    baseXp: 300, grindRatio: 0.75,
    imageAllowanceMonthly: 300, imageDailyAllowance: 20,
    voiceAllowanceMinutes: 180,
    assistantXpCost: 1, mentorXpCost: 2,
    imageOverageXpCost: 5, voiceOverageXpPerTwoMinutes: 1,
  },
  founder: {
    baseXp: 500, grindRatio: 0.75,
    imageAllowanceMonthly: 450, imageDailyAllowance: 25,
    voiceAllowanceMinutes: 450,
    assistantXpCost: 1, mentorXpCost: 2,
    imageOverageXpCost: 5, voiceOverageXpPerTwoMinutes: 1,
  },
}

function getGrindCap(plan: PlanConfig): number {
  return Math.floor(plan.baseXp * plan.grindRatio)
}

type GrindDifficulty = 1 | 2 | 3 | 4 | 5

const GRIND_REWARDS: Record<GrindDifficulty, number> = {
  1: 2, 2: 4, 3: 8, 4: 10, 5: 15,
}

interface DifficultyProbability {
  difficulty: GrindDifficulty
  probability: number
}

const DIFFICULTY_DISTRIBUTIONS: Record<PlanId, DifficultyProbability[]> = {
  free: [
    { difficulty: 1, probability: 0.60 },
    { difficulty: 2, probability: 0.25 },
    { difficulty: 3, probability: 0.08 },
    { difficulty: 4, probability: 0.05 },
    { difficulty: 5, probability: 0.02 },
  ],
  builder: [
    { difficulty: 1, probability: 0.50 },
    { difficulty: 2, probability: 0.30 },
    { difficulty: 3, probability: 0.10 },
    { difficulty: 4, probability: 0.07 },
    { difficulty: 5, probability: 0.03 },
  ],
  operator: [
    { difficulty: 1, probability: 0.40 },
    { difficulty: 2, probability: 0.30 },
    { difficulty: 3, probability: 0.20 },
    { difficulty: 4, probability: 0.07 },
    { difficulty: 5, probability: 0.03 },
  ],
  founder: [
    { difficulty: 1, probability: 0.40 },
    { difficulty: 2, probability: 0.30 },
    { difficulty: 3, probability: 0.20 },
    { difficulty: 4, probability: 0.07 },
    { difficulty: 5, probability: 0.03 },
  ],
}

const BILLING_CYCLE_DAYS = 28

async function checkAndResetCycleIfNeeded(userId: string, tier: PlanId) {
  const { data: xp, error } = await supabase
    .from("user_xp")
    .select("cycle_ends_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !xp) return

  const now = new Date()
  const cycleEnded = !xp.cycle_ends_at || new Date(xp.cycle_ends_at) <= now

  if (!cycleEnded) return

  const plan = PLANS[tier]
  const newCycleEnd = new Date(now)
  newCycleEnd.setUTCDate(newCycleEnd.getUTCDate() + BILLING_CYCLE_DAYS)

  await supabase.from("user_xp").update({
    monthly_earn_cap: getGrindCap(plan),
    monthly_earned: 0,
    grind_locked: false,
    cycle_started_at: now.toISOString(),
    cycle_ends_at: newCycleEnd.toISOString(),
    updated_at: now.toISOString(),
  }).eq("user_id", userId)

  await supabase.from("image_voice_quotas").upsert({
    user_id: userId,
    images_used_this_month: 0,
    voice_seconds_used_this_month: 0,
    cycle_started_at: now.toISOString(),
    cycle_ends_at: newCycleEnd.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: "user_id" })

  await writeTransactionLog(userId, "reset", 0, `28-day cycle reset (${tier})`)
}

// NEW: Pure functions for difficulty selection (no behavior change yet)
function selectWeightedDifficulty(distribution: DifficultyProbability[]): GrindDifficulty {
  const random = Math.random()
  let cumulative = 0
  for (const item of distribution) {
    cumulative += item.probability
    if (random < cumulative) return item.difficulty
  }
  return distribution[distribution.length - 1].difficulty
}

function canFitReward(difficulty: GrindDifficulty, remainingXp: number): boolean {
  return GRIND_REWARDS[difficulty] <= remainingXp
}

function selectEligibleDifficulty(plan: PlanId, remainingXp: number): GrindDifficulty | null {
  const distribution = DIFFICULTY_DISTRIBUTIONS[plan]
  const eligible = distribution.filter((item) => canFitReward(item.difficulty, remainingXp))

  if (eligible.length === 0) return null

  const totalProbability = eligible.reduce((sum, item) => sum + item.probability, 0)
  const normalized = eligible.map((item) => ({
    difficulty: item.difficulty,
    probability: item.probability / totalProbability,
  }))

  return selectWeightedDifficulty(normalized)
}

async function deductFromPools(
  userId: string,
  amount: number
): Promise<boolean> {
  const { data: xp, error } = await supabase
    .from("user_xp")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error || !xp) return false

  let remaining = amount
  let rollover = xp.rollover
  let purchased = xp.purchased
  let earned = xp.earned

  // Deduct order: rollover first, purchased second, earned third
  if (rollover > 0) {
    const fromRollover = Math.min(rollover, remaining)
    rollover -= fromRollover
    remaining -= fromRollover
  }

  if (remaining > 0 && purchased > 0) {
    const fromPurchased = Math.min(purchased, remaining)
    purchased -= fromPurchased
    remaining -= fromPurchased
  }

  if (remaining > 0 && earned > 0) {
    const fromEarned = Math.min(earned, remaining)
    earned -= fromEarned
    remaining -= fromEarned
  }

  if (remaining > 0) return false

  const { error: updateError } = await supabase
    .from("user_xp")
    .update({
      rollover,
      purchased,
      earned,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  return !updateError
}

async function writeTransactionLog(
  userId: string,
  transactionType: string,
  amount: number,
  description: string
) {
  await supabase.from("xp_transactions").insert({
    user_id: userId,
    transaction_type: transactionType,
    amount,
    delta_rollover: 0,
    delta_purchased: 0,
    delta_earned: 0,
    delta_reserved: 0,
    balance_rollover: 0,
    balance_purchased: 0,
    balance_earned: 0,
    balance_reserved: 0,
    description,
    metadata: {},
    created_at: new Date().toISOString(),
  })
}

serve(async (req) => {
  const payload = await req.json()
  const {
    action,
    userId,
    feature,
    totalTokens,
    modelUsed,
    reservedAmount,
    amount,
    source,
    body,
  } = payload

  const requestBody = (body && typeof body === "object") ? body as Record<string, any> : {}

  // ─────────────────────────────────────────
  // PREFLIGHT — check XP and lock reservation
  // ─────────────────────────────────────────
  if (action === "preflight") {
    const estimate = ESTIMATED_XP_COST[feature] ?? 2

    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .single()

    if (user) {
      await checkAndResetCycleIfNeeded(userId, (user.tier ?? "free") as PlanId)
    }

    const { data: xp } = await supabase
      .from("user_xp")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (!user || !xp) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "user_not_found" }),
        { status: 404 }
      )
    }

    const totalXp = xp.earned + xp.purchased + xp.rollover
    const availableXp = totalXp - xp.reserved_xp

    if (availableXp < estimate) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "insufficient_xp" }),
        { status: 200 }
      )
    }

    const { data: reserved, error: reserveError } = await supabase.rpc(
      "reserve_xp",
      { p_user_id: userId, p_amount: estimate }
    )

    if (reserveError || !reserved) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "reservation_failed" }),
        { status: 200 }
      )
    }

    await writeTransactionLog(
      userId, "reserve", estimate, `preflight: ${feature}`
    )

    return new Response(
      JSON.stringify({ allowed: true, reservedAmount: estimate }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // FINALIZE — true-up after AI responds
  // ─────────────────────────────────────────
  if (action === "finalize") {
    const actualXp = Math.ceil(totalTokens / 2000)

    await supabase.rpc("release_xp_reservation", {
      p_user_id: userId,
      p_amount: reservedAmount,
    })

    const deducted = await deductFromPools(userId, actualXp)

    if (!deducted) {
      await writeTransactionLog(
        userId, "deduct", actualXp, `${feature}: insufficient (deduction failed)`
      )
      return new Response(
        JSON.stringify({ success: false, reason: "deduction_failed" }),
        { status: 200 }
      )
    }

    await writeTransactionLog(
      userId, "deduct", actualXp, `${feature} (${totalTokens} tokens, ${modelUsed})`
    )

    return new Response(
      JSON.stringify({ success: true, xpDeducted: actualXp }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // CANCEL — release reservation if call fails
  // ─────────────────────────────────────────
  if (action === "cancel") {
    await supabase.rpc("release_xp_reservation", {
      p_user_id: userId,
      p_amount: reservedAmount,
    })

    await writeTransactionLog(
      userId, "release", reservedAmount, `cancelled: ${feature}`
    )

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // CHECK_GRIND_ELIGIBILITY — called by roadmap-generator before generating tasks
  // ─────────────────────────────────────────
  if (action === "check_grind_eligibility") {
    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .single()

    if (user) {
      await checkAndResetCycleIfNeeded(userId, (user.tier ?? "free") as PlanId)
    }

    const { data: xp } = await supabase
      .from("user_xp")
      .select("monthly_earn_cap, monthly_earned, grind_locked")
      .eq("user_id", userId)
      .single()

    if (!user || !xp) {
      return new Response(JSON.stringify({ error: "user_not_found" }), { status: 404 })
    }

    if (xp.grind_locked) {
      return new Response(JSON.stringify({ eligible: false, reason: "grind_locked" }), { status: 200 })
    }

    const plan = (user.tier ?? "free") as PlanId
    const remaining = Math.max(0, xp.monthly_earn_cap - xp.monthly_earned)
    const difficulty = selectEligibleDifficulty(plan, remaining)

    if (difficulty === null) {
      return new Response(JSON.stringify({ eligible: false, reason: "cap_exhausted" }), { status: 200 })
    }

    return new Response(JSON.stringify({
      eligible: true,
      difficulty,
      xpReward: GRIND_REWARDS[difficulty],
      remaining,
    }), { status: 200 })
  }

  // ─────────────────────────────────────────
  // AUTHORIZE_IMAGE — preflight for image quota and overage
  // ─────────────────────────────────────────
  if (action === "authorize_image") {
    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .maybeSingle()

    if (user) {
      await checkAndResetCycleIfNeeded(userId, (user.tier ?? "free") as PlanId)
    }

    const plan = PLANS[(user?.tier ?? "free") as PlanId]

    let { data: quota } = await supabase
      .from("image_voice_quotas")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (!quota) {
      const { data: newQuota } = await supabase
        .from("image_voice_quotas")
        .insert({ user_id: userId })
        .select()
        .single()
      quota = newQuota
    }

    const today = new Date().toISOString().split("T")[0]
    if (quota?.images_today_date !== today) {
      await supabase.from("image_voice_quotas").update({
        images_used_today: 0,
        images_today_date: today,
      }).eq("user_id", userId)
      quota = { ...quota, images_used_today: 0, images_today_date: today }
    }

    if ((quota?.images_used_today ?? 0) >= plan.imageDailyAllowance) {
      return new Response(JSON.stringify({ allowed: false, reason: "daily_image_limit_reached" }), { status: 200 })
    }

    const included = (quota?.images_used_this_month ?? 0) < plan.imageAllowanceMonthly

    if (included) {
      await supabase.from("image_voice_quotas").update({
        images_used_this_month: (quota?.images_used_this_month ?? 0) + 1,
        images_used_today: (quota?.images_used_today ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId)

      return new Response(JSON.stringify({ allowed: true, xpCost: 0, included: true }), { status: 200 })
    }

    const estimate = plan.imageOverageXpCost
    const { data: xp } = await supabase.from("user_xp").select("*").eq("user_id", userId).single()
    const availableXp = (xp?.earned ?? 0) + (xp?.purchased ?? 0) + (xp?.rollover ?? 0) - (xp?.reserved_xp ?? 0)

    if (availableXp < estimate) {
      return new Response(JSON.stringify({ allowed: false, reason: "insufficient_xp" }), { status: 200 })
    }

    const { data: reserved } = await supabase.rpc("reserve_xp", { p_user_id: userId, p_amount: estimate })
    if (!reserved) {
      return new Response(JSON.stringify({ allowed: false, reason: "reservation_failed" }), { status: 200 })
    }

    return new Response(JSON.stringify({ allowed: true, xpCost: estimate, included: false, reservedAmount: estimate }), { status: 200 })
  }

  // ─────────────────────────────────────────
  // RECORD_VOICE_USAGE — basic monthly usage tracking
  // ─────────────────────────────────────────
  if (action === "record_voice_usage") {
    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .maybeSingle()

    if (user) {
      await checkAndResetCycleIfNeeded(userId, (user.tier ?? "free") as PlanId)
    }

    const durationSeconds = Number(requestBody.durationSeconds ?? payload.durationSeconds ?? 0)
    if (!durationSeconds || durationSeconds <= 0) {
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    const { data: quota } = await supabase
      .from("image_voice_quotas")
      .select("voice_seconds_used_this_month")
      .eq("user_id", userId)
      .maybeSingle()

    await supabase.from("image_voice_quotas").update({
      voice_seconds_used_this_month: (quota?.voice_seconds_used_this_month ?? 0) + durationSeconds,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  }

  // ─────────────────────────────────────────
  // EARN — shared grind-cap enforcement for all earn sources
  // ─────────────────────────────────────────
  if (action === "earn") {
    const taskId = requestBody.taskId ?? payload.taskId
    const difficulty = (requestBody.difficulty ?? payload.difficulty) as GrindDifficulty | undefined
    const validSources = ["daily_quest", "treasure_map_reward", "roadmap_task_completion"]

    if (!source || !validSources.includes(source)) {
      return new Response(JSON.stringify({ success: false, reason: "invalid_source" }), { status: 400 })
    }

    const { data: user } = await supabase.from("users").select("tier").eq("id", userId).maybeSingle()
    if (!user) {
      return new Response(JSON.stringify({ success: false, reason: "user_not_found" }), { status: 404 })
    }

    await checkAndResetCycleIfNeeded(userId, (user.tier ?? "free") as PlanId)

    let expectedReward = 0

    if (source === "roadmap_task_completion") {
      if (!taskId) {
        return new Response(JSON.stringify({ success: false, reason: "task_id_required" }), { status: 400 })
      }

      const { data: task } = await supabase
        .from("tasks")
        .select("xp_reward, is_completed")
        .eq("id", taskId)
        .eq("user_id", userId)
        .maybeSingle()

      if (!task) {
        return new Response(JSON.stringify({ success: false, reason: "task_not_found" }), { status: 404 })
      }

      if (task.is_completed) {
        return new Response(JSON.stringify({ success: false, reason: "task_already_paid" }), { status: 400 })
      }

      expectedReward = Number(task.xp_reward ?? 0)
    } else {
      if (!difficulty || !GRIND_REWARDS[difficulty]) {
        return new Response(JSON.stringify({ success: false, reason: "invalid_difficulty" }), { status: 400 })
      }

      expectedReward = GRIND_REWARDS[difficulty]
      const expectedAmount = Number(amount ?? 0)
      if (expectedAmount !== expectedReward) {
        return new Response(JSON.stringify({ success: false, reason: "invalid_task_reward" }), { status: 400 })
      }
    }

    if (expectedReward <= 0) {
      return new Response(JSON.stringify({ success: false, reason: "invalid_task_reward" }), { status: 400 })
    }

    const { data: result, error } = await supabase.rpc("award_grind_xp", {
      p_user_id: userId,
      p_amount: expectedReward,
    })

    if (error || !result || result.length === 0) {
      return new Response(JSON.stringify({ success: false, reason: "grind_award_failed" }), { status: 500 })
    }

    const { awarded, locked } = result[0]
    await writeTransactionLog(userId, "earn", awarded, `${source} (requested ${expectedReward})`)

    return new Response(JSON.stringify({
      success: true,
      xpEarned: awarded,
      grindLocked: locked,
      fullyPaid: awarded === expectedReward,
      capped: awarded < expectedReward,
    }), { status: 200 })
  }

  return new Response(
    JSON.stringify({ error: "unknown_action" }),
    { status: 400 }
  )
})

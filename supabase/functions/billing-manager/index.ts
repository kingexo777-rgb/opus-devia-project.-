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
    baseXp: 150,
    grindRatio: 0.50,
    imageAllowanceMonthly: 150,
    imageDailyAllowance: 10,
    voiceAllowanceMinutes: 30,
    assistantXpCost: 1,
    mentorXpCost: 2,
    imageOverageXpCost: 5,
    voiceOverageXpPerTwoMinutes: 1,
  },
  builder: {
    baseXp: 225,
    grindRatio: 0.75,
    imageAllowanceMonthly: 300,
    imageDailyAllowance: 20,
    voiceAllowanceMinutes: 90,
    assistantXpCost: 1,
    mentorXpCost: 2,
    imageOverageXpCost: 5,
    voiceOverageXpPerTwoMinutes: 1,
  },
  operator: {
    baseXp: 300,
    grindRatio: 0.75,
    imageAllowanceMonthly: 300,
    imageDailyAllowance: 20,
    voiceAllowanceMinutes: 180,
    assistantXpCost: 1,
    mentorXpCost: 2,
    imageOverageXpCost: 5,
    voiceOverageXpPerTwoMinutes: 1,
  },
  founder: {
    baseXp: 500,
    grindRatio: 0.75,
    imageAllowanceMonthly: 450,
    imageDailyAllowance: 25,
    voiceAllowanceMinutes: 450,
    assistantXpCost: 1,
    mentorXpCost: 2,
    imageOverageXpCost: 5,
    voiceOverageXpPerTwoMinutes: 1,
  },
}

function getGrindCap(plan: PlanConfig): number {
  return Math.floor(plan.baseXp * plan.grindRatio)
}

type GrindDifficulty = 1 | 2 | 3 | 4 | 5

const GRIND_REWARDS: Record<GrindDifficulty, number> = {
  1: 2,
  2: 4,
  3: 8,
  4: 10,
  5: 15,
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

function selectWeightedDifficulty(
  distribution: DifficultyProbability[]
): GrindDifficulty {
  const random = Math.random()
  let cumulative = 0

  for (const item of distribution) {
    cumulative += item.probability
    if (random < cumulative) return item.difficulty
  }

  return distribution[distribution.length - 1].difficulty
}

function canFitReward(
  difficulty: GrindDifficulty,
  remainingXp: number
): boolean {
  return GRIND_REWARDS[difficulty] <= remainingXp
}

function selectEligibleDifficulty(
  plan: PlanId,
  remainingXp: number
): GrindDifficulty | null {
  const eligible = DIFFICULTY_DISTRIBUTIONS[plan].filter((item) =>
    canFitReward(item.difficulty, remainingXp)
  )

  if (eligible.length === 0) return null

  const totalProbability = eligible.reduce(
    (sum, item) => sum + item.probability,
    0
  )
  return selectWeightedDifficulty(
    eligible.map((item) => ({
      difficulty: item.difficulty,
      probability: item.probability / totalProbability,
    }))
  )
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

async function checkAndResetCycleIfNeeded(
  userId: string,
  tier: PlanId
): Promise<void> {
  const { data: xp } = await supabase
    .from("user_xp")
    .select("cycle_ends_at")
    .eq("user_id", userId)
    .single()

  const now = new Date()
  const cycleEnded = !xp?.cycle_ends_at || new Date(xp.cycle_ends_at) <= now
  if (!cycleEnded) return

  const newCycleEnd = new Date(now)
  newCycleEnd.setUTCDate(newCycleEnd.getUTCDate() + BILLING_CYCLE_DAYS)
  const cycleStartedAt = now.toISOString()
  const cycleEndsAt = newCycleEnd.toISOString()

  await supabase
    .from("user_xp")
    .update({
      monthly_earn_cap: getGrindCap(PLANS[tier]),
      monthly_earned: 0,
      grind_locked: false,
      cycle_started_at: cycleStartedAt,
      cycle_ends_at: cycleEndsAt,
      updated_at: cycleStartedAt,
    })
    .eq("user_id", userId)

  await supabase.from("image_voice_quotas").upsert(
    {
      user_id: userId,
      images_used_this_month: 0,
      images_used_today: 0,
      images_today_date: now.toISOString().slice(0, 10),
      voice_seconds_used_this_month: 0,
      cycle_started_at: cycleStartedAt,
      cycle_ends_at: cycleEndsAt,
      updated_at: cycleStartedAt,
    },
    { onConflict: "user_id" }
  )

  await writeTransactionLog(userId, "reset", 0, `28-day cycle reset (${tier})`)
}

serve(async (req) => {
  const {
    action,
    userId,
    feature,
    totalTokens,
    modelUsed,
    reservedAmount,
    amount,
    source,
    difficulty,
    taskId,
    durationSeconds,
  } = await req.json()

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

    if (!user) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "user_not_found" }),
        { status: 404 }
      )
    }

    const tier = (user.tier ?? "free") as PlanId
    await checkAndResetCycleIfNeeded(userId, PLANS[tier] ? tier : "free")

    const { data: xp } = await supabase
      .from("user_xp")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (!xp) {
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

  if (action === "check_grind_eligibility") {
    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .single()

    if (!user) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
      })
    }

    const tier = (user.tier ?? "free") as PlanId
    const plan = PLANS[tier] ? tier : "free"
    await checkAndResetCycleIfNeeded(userId, plan)

    const { data: xp } = await supabase
      .from("user_xp")
      .select("monthly_earn_cap, monthly_earned, grind_locked")
      .eq("user_id", userId)
      .single()

    if (!xp) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
      })
    }

    if (xp.grind_locked) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "grind_locked" }),
        { status: 200 }
      )
    }

    const remaining = Math.max(0, xp.monthly_earn_cap - xp.monthly_earned)
    const difficulty = selectEligibleDifficulty(plan, remaining)

    if (difficulty === null) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "cap_exhausted" }),
        { status: 200 }
      )
    }

    return new Response(
      JSON.stringify({
        eligible: true,
        difficulty,
        xpReward: GRIND_REWARDS[difficulty],
        remaining,
      }),
      { status: 200 }
    )
  }

  if (action === "authorize_image") {
    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .single()
    const tier = (user?.tier ?? "free") as PlanId
    const planId = PLANS[tier] ? tier : "free"
    await checkAndResetCycleIfNeeded(userId, planId)
    const plan = PLANS[planId]

    let { data: quota } = await supabase
      .from("image_voice_quotas")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (!quota) {
      const { data: createdQuota } = await supabase
        .from("image_voice_quotas")
        .insert({ user_id: userId })
        .select()
        .single()
      quota = createdQuota
    }

    if (!quota) {
      return new Response(JSON.stringify({ allowed: false, reason: "quota_unavailable" }), {
        status: 500,
      })
    }

    const today = new Date().toISOString().slice(0, 10)
    if (quota.images_today_date !== today) {
      await supabase
        .from("image_voice_quotas")
        .update({ images_used_today: 0, images_today_date: today })
        .eq("user_id", userId)
      quota.images_used_today = 0
    }

    if (quota.images_used_today >= plan.imageDailyAllowance) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "daily_image_limit_reached" }),
        { status: 200 }
      )
    }

    if (quota.images_used_this_month < plan.imageAllowanceMonthly) {
      await supabase
        .from("image_voice_quotas")
        .update({
          images_used_this_month: quota.images_used_this_month + 1,
          images_used_today: quota.images_used_today + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      return new Response(
        JSON.stringify({ allowed: true, xpCost: 0, included: true }),
        { status: 200 }
      )
    }

    const estimate = plan.imageOverageXpCost
    const { data: xp } = await supabase
      .from("user_xp")
      .select("earned, purchased, rollover, reserved_xp")
      .eq("user_id", userId)
      .single()
    const availableXp = xp
      ? xp.earned + xp.purchased + xp.rollover - xp.reserved_xp
      : 0

    if (availableXp < estimate) {
      return new Response(JSON.stringify({ allowed: false, reason: "insufficient_xp" }), {
        status: 200,
      })
    }

    const { data: reserved, error: reservationError } = await supabase.rpc(
      "reserve_xp",
      { p_user_id: userId, p_amount: estimate }
    )
    if (reservationError || !reserved) {
      return new Response(JSON.stringify({ allowed: false, reason: "reservation_failed" }), {
        status: 200,
      })
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        xpCost: estimate,
        included: false,
        reservedAmount: estimate,
      }),
      { status: 200 }
    )
  }

  if (action === "record_voice_usage") {
    const duration = Number(durationSeconds ?? 0)
    if (duration <= 0) {
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .single()
    const tier = (user?.tier ?? "free") as PlanId
    await checkAndResetCycleIfNeeded(userId, PLANS[tier] ? tier : "free")

    const { data: quota } = await supabase
      .from("image_voice_quotas")
      .select("voice_seconds_used_this_month")
      .eq("user_id", userId)
      .single()

    const current = quota?.voice_seconds_used_this_month ?? 0
    const { error } = await supabase
      .from("image_voice_quotas")
      .update({
        voice_seconds_used_this_month: current + Math.floor(duration),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    return new Response(JSON.stringify({ success: !error }), { status: error ? 500 : 200 })
  }

  // EARN — every earn source is constrained by the shared cycle cap.
  if (action === "earn") {
    const validSources = [
      "daily_quest",
      "treasure_map_reward",
      "roadmap_task_completion",
    ]
    if (!validSources.includes(source)) {
      return new Response(JSON.stringify({ success: false, reason: "invalid_source" }), {
        status: 400,
      })
    }

    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .single()
    if (!user) {
      return new Response(JSON.stringify({ success: false, reason: "user_not_found" }), {
        status: 404,
      })
    }

    const tier = (user.tier ?? "free") as PlanId
    await checkAndResetCycleIfNeeded(userId, PLANS[tier] ? tier : "free")

    let expectedReward: number
    if (source === "roadmap_task_completion") {
      const { data: task } = await supabase
        .from("tasks")
        .select("xp_reward, is_completed")
        .eq("id", taskId)
        .eq("user_id", userId)
        .single()

      if (!task) {
        return new Response(JSON.stringify({ success: false, reason: "task_not_found" }), {
          status: 404,
        })
      }
      if (task.is_completed) {
        return new Response(JSON.stringify({ success: false, reason: "task_already_paid" }), {
          status: 400,
        })
      }
      expectedReward = task.xp_reward ?? 0
    } else {
      const taskDifficulty = difficulty as GrindDifficulty
      if (![1, 2, 3, 4, 5].includes(taskDifficulty) || !GRIND_REWARDS[taskDifficulty]) {
        return new Response(JSON.stringify({ success: false, reason: "invalid_difficulty" }), {
          status: 400,
        })
      }
      expectedReward = GRIND_REWARDS[taskDifficulty]
      if (amount !== expectedReward) {
        return new Response(JSON.stringify({ success: false, reason: "invalid_task_reward" }), {
          status: 400,
        })
      }
    }

    const { data: result, error } = await supabase.rpc("award_grind_xp", {
      p_user_id: userId,
      p_amount: expectedReward,
    })
    if (error || !result || result.length === 0) {
      return new Response(JSON.stringify({ success: false, reason: "grind_award_failed" }), {
        status: 500,
      })
    }

    const { awarded, locked } = result[0]
    await writeTransactionLog(userId, "earn", awarded, `${source} (requested ${expectedReward})`)
    return new Response(
      JSON.stringify({
        success: true,
        xpEarned: awarded,
        grindLocked: locked,
        fullyPaid: awarded === expectedReward,
        capped: awarded < expectedReward,
      }),
      { status: 200 }
    )
  }

  return new Response(
    JSON.stringify({ error: "unknown_action" }),
    { status: 400 }
  )
})

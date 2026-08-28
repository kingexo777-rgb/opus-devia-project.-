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
  const {
    action,
    userId,
    feature,
    totalTokens,
    modelUsed,
    reservedAmount,
    amount,
    source,
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
  // EARN — called when user completes a task
  // ─────────────────────────────────────────
  if (action === "earn") {
    const { data: xp } = await supabase
      .from("user_xp")
      .select("earned")
      .eq("user_id", userId)
      .single()

    if (!xp) {
      return new Response(
        JSON.stringify({ success: false, reason: "user_not_found" }),
        { status: 404 }
      )
    }

    // Get user tier for multiplier
    const { data: user } = await supabase
      .from("users")
      .select("tier")
      .eq("id", userId)
      .single()

    const multiplier = XP_MULTIPLIERS[user?.tier ?? "free"] ?? 1
    const xpEarned = Math.floor((amount ?? 0) * multiplier)

    await supabase
      .from("user_xp")
      .update({
        earned: xp.earned + xpEarned,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    await writeTransactionLog(
      userId, "earn", xpEarned, source ?? "task_completion"
    )

    return new Response(
      JSON.stringify({ success: true, xpEarned }),
      { status: 200 }
    )
  }

  return new Response(
    JSON.stringify({ error: "unknown_action" }),
    { status: 400 }
  )
})

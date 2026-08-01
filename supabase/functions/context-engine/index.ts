import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5"
import { buildMentorSystemPrompt } from "../_shared/governance/system-prompts.ts"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const LIVE_WINDOW_SIZE = 6
const TRIGGER_THRESHOLD = 10

// CORS helper
function cors(body: BodyInit | null, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set("Access-Control-Allow-Origin", "*")
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type")
  return new Response(body, { ...init, headers })
}

async function getLiveWindow(sessionId: string) {
  const { data } = await supabase
    .from("memory_live_window")
    .select("role, content, message_order")
    .eq("session_id", sessionId)
    .order("message_order", { ascending: true })
  return data ?? []
}

async function getSessionSummary(sessionId: string) {
  const { data } = await supabase
    .from("memory_session_summary")
    .select("summary, updated_at")
    .eq("session_id", sessionId)
    .maybeSingle()
  return data
}

async function getPersistentMemory(userId: string) {
  const { data: memoryRows } = await supabase
    .from("memory_persistent")
    .select("memory_key, memory_value")
    .eq("user_id", userId)

  // Convert key-value rows to object for easy access
  return Object.fromEntries(
    (memoryRows ?? []).map((r: any) => [r.memory_key, r.memory_value])
  )
}

async function getRelevantEvents(userId: string) {
  const { data } = await supabase
    .from("memory_events")
    .select("event_type, event_data, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10)

  // Filter events where severity >= 0.6 and is_resolved = false
  const unresolved = (data ?? []).filter(
    (e: any) =>
      e.event_data &&
      !e.event_data.is_resolved &&
      (e.event_data.severity ?? 0) >= 0.6
  )
  return unresolved.slice(0, 3)
}

async function getCachedAnalysis(userId: string) {
  const { data } = await supabase
    .from("memory_cached_analysis")
    .select("analysis_type, payload, created_at")
    .eq("user_id", userId)
    .is("invalidated_at", null)
    .maybeSingle()
  return data
}

async function appendToLiveWindow(
  userId: string,
  sessionId: string,
  role: string,
  content: string,
  messageIndex: number
) {
  await supabase.from("memory_live_window").insert({
    user_id: userId,
    session_id: sessionId,
    role,
    content,
    message_order: messageIndex,
    created_at: new Date().toISOString(),
  })
}

// Calls DeepSeek V4 Flash for summarization
async function callDeepSeekFlash(prompt: string): Promise<string> {
  const response = await fetch(
    `${Deno.env.get("DEEPSEEK_BASE_URL")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("DEEPSEEK_MODEL"),
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    }
  )
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ""
}

async function triggerSummarization(
  userId: string,
  sessionId: string,
  liveWindow: any[],
  existingSummary: any
) {
  const toArchive = liveWindow.slice(0, liveWindow.length - LIVE_WINDOW_SIZE)

  if (toArchive.length === 0) return existingSummary

  const formattedMessages = toArchive
    .map((m: any) => `${m.role}: ${m.content}`)
    .join("\n")

  const previousSummary = existingSummary
    ? `Previous summary: ${JSON.stringify(existingSummary)}\n\n`
    : ""

  const summarizationPrompt = `${previousSummary}Summarize the following conversation. Extract ONLY: goals, decisions, commitments, failures, bottlenecks, progress updates, emotional indicators, behavioral patterns, strategic insights. Remove all filler, greetings, repetition. Return structured JSON only with keys: strategic_state, active_goals, behavioral_patterns, roadmap_progress, recent_context, active_bottlenecks, active_leverage_points, emotional_state.\n\n${formattedMessages}`

  const summaryResponse = await callDeepSeekFlash(summarizationPrompt)

  let parsedSummary
  try {
    const clean = summaryResponse.replace(/```json|```/g, "").trim()
    parsedSummary = JSON.parse(clean)
  } catch {
    // Retry once with stricter instruction
    const retryResponse = await callDeepSeekFlash(
      summarizationPrompt +
        "\n\nYour previous response was not valid JSON. Return only the JSON object with no other content."
    )
    try {
      const clean = retryResponse.replace(/```json|```/g, "").trim()
      parsedSummary = JSON.parse(clean)
    } catch {
      // Fall back to existing summary
      return existingSummary
    }
  }

  const { data: existing } = await supabase
    .from("memory_session_summary")
    .select("id")
    .eq("session_id", sessionId)
    .single()

  if (existing) {
    await supabase
      .from("memory_session_summary")
      .update({
        summary: parsedSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId)
  } else {
    await supabase.from("memory_session_summary").insert({
      user_id: userId,
      session_id: sessionId,
      summary: parsedSummary,
      token_count: summarizationPrompt.length / 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return parsedSummary
}

function buildFinalPrompt(
  userSettings: { display_name?: string; archetype?: string } | null,
  persistentMemory: any,
  sessionSummary: any,
  events: any[],
  cachedAnalysis: any,
  liveWindow: any[],
  userMessage: string,
  assertivenessLevel: 1 | 2 | 3 | 4 | 5
): string {
  const systemPrompt = buildMentorSystemPrompt(
    assertivenessLevel,
    {
      profile: {
        name: userSettings?.display_name,
        archetype: userSettings?.archetype,
      },
      roadmapState: null,
      behavioralPatterns: persistentMemory ?? null,
      recentEvents: events ?? [],
    }
  )

  // Strip terminal directive — we append user input below
  const systemCore = systemPrompt.replace(/\nNow respond to the user\.$/, "")

  const summarySection = sessionSummary?.summary
    ? `SESSION CONTEXT:
Strategic state: ${sessionSummary.summary.strategic_state ?? ""}
Active goals: ${JSON.stringify(sessionSummary.summary.active_goals ?? [])}
Current bottlenecks: ${JSON.stringify(sessionSummary.summary.active_bottlenecks ?? [])}
Emotional state: ${sessionSummary.summary.emotional_state ?? "unknown"}`
    : "SESSION CONTEXT: Session just started."

  const analysisSection = cachedAnalysis?.payload
    ? `STRATEGIC ANALYSIS:
Key leverage points: ${JSON.stringify(cachedAnalysis.payload.leverage_points ?? {})}
Execution profile: ${JSON.stringify(cachedAnalysis.payload.execution_profile ?? {})}`
    : ""

  const dialogueSection = liveWindow
    .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n")

  return [
    systemCore,
    summarySection,
    analysisSection,
    `RECENT DIALOGUE:\n${dialogueSection}`,
    `CURRENT INPUT: ${userMessage}`,
  ]
    .filter(Boolean)
    .join("\n\n")
}

async function wrapUpSession(userId: string, sessionId: string) {
  const liveWindow = await getLiveWindow(sessionId)
  const sessionSummary = await getSessionSummary(sessionId)

  const combinedContext = [
    sessionSummary ? JSON.stringify(sessionSummary) : "",
    liveWindow.map((m: any) => `${m.role}: ${m.content}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n")

  const extractionPrompt = `Based on the following conversation extract key facts for long term memory. Return JSON with keys: user_stage, long_term_goals, recurring_failures, strengths, weaknesses, execution_patterns, mentor_observations, consistency_score, discipline_trend, last_major_event.\n\n${combinedContext}`

  const extractedFacts = await callDeepSeekFlash(extractionPrompt)

  try {
    const clean = extractedFacts.replace(/```json|```/g, "").trim()
    const facts = JSON.parse(clean)

    const { data: existing } = await supabase
      .from("memory_persistent")
      .select("user_id")
      .eq("user_id", userId)
      .limit(1)

    const persistentData: Record<string, any> = {
      user_stage: facts.user_stage,
      long_term_goals: facts.long_term_goals ?? [],
      recurring_failures: facts.recurring_failures ?? [],
      strengths: facts.strengths ?? [],
      weaknesses: facts.weaknesses ?? [],
      execution_patterns: facts.execution_patterns ?? [],
      mentor_observations: facts.mentor_observations ?? "",
      consistency_score: facts.consistency_score ?? 0,
      discipline_trend: facts.discipline_trend ?? "unknown",
      last_major_event: facts.last_major_event ?? "",
    }

    for (const [key, value] of Object.entries(persistentData)) {
      await supabase.from("memory_persistent").upsert({
        user_id: userId,
        memory_key: key,
        memory_value: value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,memory_key"
      })
    }

    await supabase.from("memory_session_archive").insert({
      user_id: userId,
      session_id: sessionId,
      archive_payload: {
        session_summary: combinedContext.substring(0, 2000),
        major_events: [],
        strategic_updates: facts,
        behavioral_changes: {},
        token_cost: combinedContext.length / 4,
      },
      created_at: new Date().toISOString(),
    })

    await supabase
      .from("sessions")
      .update({
        ended_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", sessionId)

    await supabase
      .from("memory_live_window")
      .delete()
      .eq("session_id", sessionId)
  } catch {
    // Fail silently, preserve data integrity
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return cors(null, { status: 204 })
  }

  // ───────────────────────────────────────
  // JWT VERIFICATION
  // ───────────────────────────────────────
  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return cors(JSON.stringify({ error: "Missing or invalid authorization header" }), { status: 401 })
  }

  const token = authHeader.replace("Bearer ", "")
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !authUser) {
    return cors(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 })
  }

  const authenticatedUserId = authUser.id

  // Safe body parsing
  const rawBody = await req.text()
  if (!rawBody || rawBody.trim() === "") {
    return cors(JSON.stringify({ error: "Empty request body" }), { status: 400 })
  }

  const body = JSON.parse(rawBody)
  const {
    action,
    sessionId,
    userMessage,
    assistantMessage,
    messageIndex,
    assertivenessLevel,
  } = body

  // ─────────────────────────────────────────
  // GET CONTEXT — assemble full context package
  // ─────────────────────────────────────────
  if (action === "get_context") {
    const [liveWindow, sessionSummary, persistentMemory, events, cachedAnalysis] =
      await Promise.all([
        getLiveWindow(sessionId),
        getSessionSummary(sessionId),
        getPersistentMemory(authenticatedUserId),
        getRelevantEvents(authenticatedUserId),
        getCachedAnalysis(authenticatedUserId),
      ])

    // ── Fetch user settings for governance-aware prompt ──
    const { data: userSettings } = await supabase
      .from("users")
      .select("assertiveness_level, archetype, display_name")
      .eq("id", authenticatedUserId)
      .single()

    const assertivenessLevel = (userSettings?.assertiveness_level ?? 3) as 1 | 2 | 3 | 4 | 5

    let finalSummary = sessionSummary
    if (liveWindow.length >= TRIGGER_THRESHOLD) {
      finalSummary = await triggerSummarization(
        authenticatedUserId,
        sessionId,
        liveWindow,
        sessionSummary
      )
    }

    const trimmedWindow = liveWindow.slice(-LIVE_WINDOW_SIZE)

    const finalPrompt = buildFinalPrompt(
      userSettings,
      persistentMemory,
      finalSummary,
      events,
      cachedAnalysis,
      trimmedWindow,
      userMessage,
      assertivenessLevel
    )

    return cors(
      JSON.stringify({
        prompt: finalPrompt,
        liveWindowCount: trimmedWindow.length,
        hasPersistentMemory: Object.keys(persistentMemory ?? {}).length > 0,
        hasSessionSummary: !!finalSummary,
        eventCount: events.length,
      }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // APPEND MESSAGE — write to live window
  // ─────────────────────────────────────────
  if (action === "append_message") {
    await appendToLiveWindow(
      authenticatedUserId,
      sessionId,
      "user",
      userMessage,
      messageIndex
    )

    if (assistantMessage) {
      await appendToLiveWindow(
        authenticatedUserId,
        sessionId,
        "assistant",
        assistantMessage,
        messageIndex + 1
      )
    }

    return cors(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // WRAP UP — called when user closes mentor
  // ─────────────────────────────────────────
  if (action === "wrap_up") {
    await wrapUpSession(authenticatedUserId, sessionId)
    return cors(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  }

  return cors(
    JSON.stringify({ error: "unknown_action" }),
    { status: 400 }
  )
})

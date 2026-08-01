import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5"
import { routeAIRequest, GovernanceViolationError } from "../_shared/governance/router.ts"
import { getProviderCredentials } from "../_shared/governance/model-secrets.ts"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

// ─────────────────────────────────────────
// TOKEN CAPS — tier-aware output limits
// Derived from governance tier structure
// ─────────────────────────────────────────
const TOKEN_CAPS: Record<string, Record<string, number>> = {
  mentor_message: { free: 300, builder: 600, operator: 1000, founder: 1500 },
  assistant_message: { free: 200, builder: 400, operator: 600, founder: 800 },
  roadmap_assistant_message: { free: 150, builder: 400, operator: 600, founder: 800 },
  journal_assistant_message: { free: 0, builder: 300, operator: 500, founder: 700 },
  daily_review: { free: 200, builder: 500, operator: 800, founder: 1000 },
  weekly_review: { free: 0, builder: 1000, operator: 2000, founder: 3000 },
  monthly_breakdown: { free: 0, builder: 1500, operator: 2500, founder: 4000 },
}

interface ModelResponse {
  content: string
  inputTokens: number
  outputTokens: number
}

// ─────────────────────────────────────────
// MODEL CALL FUNCTIONS
// Credentials injected from governance router
// ─────────────────────────────────────────

// Call Mentor — DeepSeek V4 Pro
async function callMentor(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<ModelResponse> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  })
  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  }
}

// Call Gemini 2.5 Flash
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string,
  imageBase64?: string
): Promise<ModelResponse> {
  const parts: any[] = [{ text: `${systemPrompt}\n\n${userPrompt}` }]

  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64,
      },
    })
  }

  const response = await fetch(
    `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  )

  const data = await response.json()
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  }
}

// ─────────────────────────────────────────
// STREAMING MODEL CALLS
// Return raw upstream ReadableStream for piping
// ─────────────────────────────────────────

// Stream from Mentor — DeepSeek V4 Pro (SSE)
async function callMentorStream(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => "")
    throw new Error(`DeepSeek stream failed: ${response.status} ${errText}`)
  }

  return response.body
}

// Stream from Gemini 2.5 Flash (SSE via streamGenerateContent)
async function callGeminiStream(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string,
  imageBase64?: string
): Promise<ReadableStream<Uint8Array>> {
  const parts: any[] = [{ text: `${systemPrompt}\n\n${userPrompt}` }]

  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64,
      },
    })
  }

  const response = await fetch(
    `${baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  )

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => "")
    throw new Error(`Gemini stream failed: ${response.status} ${errText}`)
  }

  return response.body
}

// ─────────────────────────────────────────
// STREAM TRANSFORMER
// Parses provider-specific SSE chunks → clean client SSE
// Accumulates fullContent & fires background side effects in flush()
// ─────────────────────────────────────────

interface StreamCompletionCallback {
  (fullContent: string, inputTokens: number, outputTokens: number): void
}

function createStreamTransformer(
  provider: string,
  onComplete: StreamCompletionCallback
): TransformStream<Uint8Array, Uint8Array> {
  let fullContent = ""
  let inputTokens = 0
  let outputTokens = 0
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ""

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })

      // Process complete SSE lines; hold back incomplete final line
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data: ")) continue
        const jsonStr = trimmed.slice(6).trim()
        if (jsonStr === "[DONE]") continue

        try {
          const data = JSON.parse(jsonStr)
          let delta = ""

          if (provider === "MENTOR" || provider === "DEEPSEEK") {
            delta = data.choices?.[0]?.delta?.content ?? ""
            if (data.usage) {
              inputTokens = data.usage.prompt_tokens ?? inputTokens
              outputTokens = data.usage.completion_tokens ?? outputTokens
            }
          } else if (provider === "GEMINI" || provider === "ASSISTANT") {
            delta = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
            if (data.usageMetadata) {
              inputTokens = data.usageMetadata.promptTokenCount ?? inputTokens
              outputTokens = data.usageMetadata.candidatesTokenCount ?? outputTokens
            }
          }

          if (delta) {
            fullContent += delta
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            )
          }
        } catch {
          // Skip unparseable SSE lines (keep-alive comments, etc.)
        }
      }
    },

    flush(controller) {
      // Process any remaining buffered line
      const trimmed = buffer.trim()
      if (trimmed.startsWith("data: ") && !trimmed.includes("[DONE]")) {
        const jsonStr = trimmed.slice(6).trim()
        try {
          const data = JSON.parse(jsonStr)
          let delta = ""
          if (provider === "MENTOR" || provider === "DEEPSEEK") {
            delta = data.choices?.[0]?.delta?.content ?? ""
          } else if (provider === "GEMINI" || provider === "ASSISTANT") {
            delta = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
          }
          if (delta) {
            fullContent += delta
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            )
          }
        } catch { /* skip */ }
      }

      // Signal end of stream
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))

      // Fire completion callback (non-blocking — caller handles fire-and-forget)
      onComplete(fullContent, inputTokens, outputTokens)
    },
  })
}

// Call DeepSeek V4 Flash — background jobs only
async function callDeepSeekFlash(
  prompt: string,
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<ModelResponse> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  }
}

// Call OpenAI TTS — mentor text responses only
async function callTTS(
  text: string,
  apiKey: string,
  baseUrl: string
): Promise<{ audioBase64: string }> {
  const response = await fetch(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "onyx",
      input: text,
    }),
  })

  const audioBuffer = await response.arrayBuffer()
  const audioBase64 = btoa(
    String.fromCharCode(...new Uint8Array(audioBuffer))
  )

  return { audioBase64 }
}

// Call OpenAI Whisper — mentor sessions only
async function callWhisper(
  audioBase64: string,
  apiKey: string,
  baseUrl: string
): Promise<{ transcription: string }> {
  const audioBuffer = Uint8Array.from(atob(audioBase64), (c) =>
    c.charCodeAt(0)
  )

  const formData = new FormData()
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/webm" }),
    "audio.webm"
  )
  formData.append("model", "whisper-1")
  formData.append("response_format", "text")
  formData.append("temperature", "0")

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  const transcription = await response.text()
  return { transcription }
}

// ─────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────
serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }

  const cors = (body: BodyInit | null, init?: ResponseInit): Response => {
    const headers = new Headers(init?.headers)
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v))
    return new Response(body, { ...init, headers })
  }

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

  // ───────────────────────────────────────
  // STARTUP: Verify the three active providers
  // ───────────────────────────────────────
  try {
    const mentorCreds = getProviderCredentials("MENTOR")
    const geminiCreds = getProviderCredentials("GEMINI")
    const deepseekCreds = getProviderCredentials("DEEPSEEK")
    if (!mentorCreds.apiKey || !geminiCreds.apiKey || !deepseekCreds.apiKey) {
      console.error("CRITICAL: Model credentials not resolving. Check environment variables.")
    }
  } catch (e) {
    console.error("CRITICAL: Model credential resolution failed:", e instanceof Error ? e.message : String(e))
  }

  // Body parsing
  const rawBody = await req.text()
  if (!rawBody || rawBody.trim() === "") {
    return cors(JSON.stringify({ error: "Empty request body" }), { status: 400 })
  }
  const body = JSON.parse(rawBody)
  const { sessionId, feature, prompt, imageBase64, audioBase64, voiceOutput } = body

  // ───────────────────────────────────────
  // FETCH USER PROFILE
  // ───────────────────────────────────────
  const { data: userProfile } = await supabase
    .from("users")
    .select("tier, assertiveness_level, archetype, display_name")
    .eq("id", authenticatedUserId)
    .single()

  if (!userProfile) {
    return cors(JSON.stringify({ error: "user_not_found" }), { status: 404 })
  }

  const tier = (userProfile.tier ?? "free") as "free" | "builder" | "operator" | "founder"
  const assertivenessLevel = (userProfile.assertiveness_level ?? 3) as 1 | 2 | 3 | 4 | 5

  // ───────────────────────────────────────
  // FETCH CONTEXT DATA for mentor system prompt
  // ───────────────────────────────────────
  let roadmapState = null
  let behavioralPatterns = null

  if (feature === "mentor_message") {
    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("title, archetype, current_phase, total_phases, roadmap_data")
      .eq("user_id", authenticatedUserId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    roadmapState = roadmap

    const { data: memoryRows } = await supabase
      .from("memory_persistent")
      .select("memory_key, memory_value")
      .eq("user_id", authenticatedUserId)

    behavioralPatterns = Object.fromEntries(
      (memoryRows ?? []).map((r: any) => [r.memory_key, r.memory_value])
    )
  }

  // ───────────────────────────────────────
  // GOVERNANCE ROUTING
  // ───────────────────────────────────────
  let routeResult
  try {
    routeResult = routeAIRequest({
      feature: feature as any,
      userTier: tier,
      sessionType: feature === "mentor_message" ? "mentor" : "assistant",
      assertivenessLevel,
      userData: {
        profile: {
          name: userProfile.display_name,
          archetype: userProfile.archetype,
          tier: userProfile.tier,
          assertiveness: assertivenessLevel,
        },
        roadmapState,
        behavioralPatterns,
        recentEvents: [],
      },
      assistantTone: "standard",
      shelf: {},
      preloadedData: {},
    })
  } catch (err) {
    if (err instanceof GovernanceViolationError) {
      const status = err.code === "feature_not_available" ? 403
        : err.code === "voice_scope_violation" ? 403
        : 400
      return cors(JSON.stringify({ error: err.code, reason: err.message }), { status })
    }
    return cors(JSON.stringify({ error: "routing_failed", detail: String(err) }), { status: 500 })
  }

  const { credentials, systemPrompt, backgroundJob } = routeResult

  // ─────────────────────────────────────────
  // VOICE INPUT — Whisper
  // ─────────────────────────────────────────
  if (feature === "voice_input") {
    if (!sessionId) {
      return cors(JSON.stringify({ error: "voice_input_requires_active_mentor_session" }), { status: 400 })
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("session_type, status")
      .eq("id", sessionId)
      .single()

    if (!session || session.session_type !== "mentor" || session.status !== "active") {
      return cors(JSON.stringify({ error: "voice_input_only_permitted_in_active_mentor_sessions" }), { status: 403 })
    }

    const { transcription } = await callWhisper(audioBase64, credentials.apiKey, credentials.baseUrl)
    return cors(JSON.stringify({ transcription }), { status: 200 })
  }

  // ─────────────────────────────────────────
  // BACKGROUND JOBS — no XP, no system prompt
  // ─────────────────────────────────────────
  if (backgroundJob) {
    const result = await callDeepSeekFlash(
      prompt,
      800,
      credentials.apiKey,
      credentials.baseUrl,
      credentials.model
    )

    let parsed
    try {
      const clean = result.content.replace(/```json|```/g, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      const retry = await callDeepSeekFlash(
        prompt + "\n\nYour previous response was not valid JSON. Return only the JSON object with no other content.",
        800,
        credentials.apiKey,
        credentials.baseUrl,
        credentials.model
      )
      try {
        const clean = retry.content.replace(/```json|```/g, "").trim()
        parsed = JSON.parse(clean)
      } catch {
        return cors(JSON.stringify({ error: "json_parse_failed", raw: result.content }), { status: 200 })
      }
    }

    return cors(JSON.stringify({ result: parsed }), { status: 200 })
  }

  // ─────────────────────────────────────────
  // TOKEN CAP CHECK
  // ─────────────────────────────────────────
  const maxTokens = TOKEN_CAPS[feature]?.[tier] ?? 300

  if (maxTokens === 0) {
    return cors(JSON.stringify({
      error: "feature_not_available",
      reason: `${feature} is not available on the ${tier} tier`,
    }), { status: 403 })
  }

  // ─────────────────────────────────────────
  // XP PREFLIGHT
  // ─────────────────────────────────────────
  const preflightResponse = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "preflight", userId: authenticatedUserId, feature }),
  }
  )

  const preflight = await preflightResponse.json()

  if (!preflight.allowed) {
    return cors(JSON.stringify({ error: preflight.reason }), { status: 402 })
  }

  const reservedAmount = preflight.reservedAmount

  // ─────────────────────────────────────────
  // STREAMING PATH — chat features use SSE streaming
  // ─────────────────────────────────────────
  const useStreaming = feature === "mentor_message" || feature === "assistant_message"

  if (useStreaming) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!

    // Capture state for fire-and-forget closures
    const finalizePayload = {
      action: "finalize" as const,
      userId: authenticatedUserId,
      feature,
      modelUsed: credentials.provider,
      reservedAmount,
    }

    const handleStreamComplete: StreamCompletionCallback = (
      fullContent,
      inputTokens,
      outputTokens
    ) => {
      // Background: finalize billing (non-blocking)
      fetch(`${supabaseUrl}/functions/v1/billing-manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...finalizePayload,
          totalTokens: inputTokens + outputTokens,
        }),
      }).catch((e) =>
        console.error("[stream] finalize failed:", e instanceof Error ? e.message : String(e))
      )

      // Background: append to memory (non-blocking, mentor only)
      if (sessionId && feature === "mentor_message" && fullContent) {
        supabase
          .from("memory_live_window")
          .select("message_order")
          .eq("session_id", sessionId)
          .order("message_order", { ascending: false })
          .limit(1)
          .then(({ data: windowData }) => {
            const nextIndex = (windowData?.[0]?.message_order ?? -1) + 1
            return fetch(`${supabaseUrl}/functions/v1/context-engine`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                action: "append_message",
                sessionId,
                userMessage: prompt,
                assistantMessage: fullContent,
                messageIndex: nextIndex,
              }),
            })
          })
          .catch((e) =>
            console.error("[stream] memory append failed:", e instanceof Error ? e.message : String(e))
          )
      }
    }

    try {
      let upstreamStream: ReadableStream<Uint8Array>

      if (credentials.provider === "MENTOR") {
        upstreamStream = await callMentorStream(
          systemPrompt, prompt, maxTokens,
          credentials.apiKey, credentials.baseUrl, credentials.model
        )
      } else if (credentials.provider === "GEMINI" || credentials.provider === "ASSISTANT") {
        upstreamStream = await callGeminiStream(
          systemPrompt, prompt, maxTokens,
          credentials.apiKey, credentials.baseUrl, credentials.model,
          imageBase64
        )
      } else {
        throw new Error(`Unhandled streaming provider: ${credentials.provider}`)
      }

      const transformer = createStreamTransformer(credentials.provider, handleStreamComplete)
      const clientStream = upstreamStream.pipeThrough(transformer)

      return new Response(clientStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (error) {
      // Stream setup failed — cancel the preflight reservation
      await fetch(`${supabaseUrl}/functions/v1/billing-manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "cancel",
          userId: authenticatedUserId,
          reservedAmount,
          feature,
        }),
      }).catch(() => {})

      return cors(
        JSON.stringify({ error: "model_stream_failed", detail: String(error) }),
        { status: 500 }
      )
    }
  }

  // ─────────────────────────────────────────
  // NON-STREAMING PATH — background jobs, voice, TTS
  // ─────────────────────────────────────────
  let result: ModelResponse
  try {
    if (credentials.provider === "MENTOR") {
      result = await callMentor(
        systemPrompt, prompt, maxTokens,
        credentials.apiKey, credentials.baseUrl, credentials.model
      )
    } else if (credentials.provider === "GEMINI" || credentials.provider === "ASSISTANT") {
      result = await callGemini(
        systemPrompt, prompt, maxTokens,
        credentials.apiKey, credentials.baseUrl, credentials.model,
        imageBase64
      )
    } else {
      throw new Error(`Unhandled provider: ${credentials.provider}`)
    }
  } catch (error) {
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "cancel",
          userId: authenticatedUserId,
          reservedAmount,
          feature,
        }),
      }
    )
    return cors(JSON.stringify({ error: "model_call_failed", detail: String(error) }), { status: 500 })
  }

  const totalTokens = result.inputTokens + result.outputTokens

  // ─────────────────────────────────────────
  // XP FINALIZE
  // ─────────────────────────────────────────
  await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "finalize",
        userId: authenticatedUserId,
        feature,
        totalTokens,
        modelUsed: credentials.provider,
        reservedAmount,
      }),
    }
  )

  // ─────────────────────────────────────────
  // APPEND TO MEMORY
  // ─────────────────────────────────────────
  if (sessionId && feature === "mentor_message") {
    const { data: windowData } = await supabase
      .from("memory_live_window")
      .select("message_order")
      .eq("session_id", sessionId)
      .order("message_order", { ascending: false })
      .limit(1)

    const nextIndex = (windowData?.[0]?.message_order ?? -1) + 1

    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/context-engine`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "append_message",
          sessionId,
          userMessage: prompt,
          assistantMessage: result.content,
          messageIndex: nextIndex,
        }),
      }
    )
  }

  // ─────────────────────────────────────────
  // VOICE OUTPUT — TTS
  // ─────────────────────────────────────────
  let audioBase64Response: string | null = null

  if (voiceOutput && feature === "mentor_message") {
    try {
      const ttsCreds = getProviderCredentials("OPENAI_TTS")
      const ttsResult = await callTTS(result.content, ttsCreds.apiKey, ttsCreds.baseUrl)
      audioBase64Response = ttsResult.audioBase64
    } catch (ttsError) {
      console.error("TTS generation failed:", ttsError instanceof Error ? ttsError.message : String(ttsError))
    }
  }

  return cors(JSON.stringify({
    content: result.content,
    model: credentials.provider,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    totalTokens,
    audio: audioBase64Response,
  }), { status: 200 })
})

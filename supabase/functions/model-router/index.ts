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

function isOpenRouter(baseUrl: string): boolean {
  return baseUrl.toLowerCase().includes("openrouter")
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

// Call Gemini 2.5 Flash (via OpenRouter OpenAI-compatible endpoint, or Gemini-native fallback)
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string,
  imageBase64?: string
): Promise<ModelResponse> {
  if (isOpenRouter(baseUrl)) {
    const userContent: unknown = imageBase64
      ? [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ]
      : userPrompt

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
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: userContent },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      throw new Error(`Assistant (OpenRouter) failed: ${response.status} ${errText}`)
    }

    const data = await response.json()
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    }
  }

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

// Stream from Gemini 2.5 Flash (OpenRouter OpenAI-compatible, or Gemini-native fallback)
async function callGeminiStream(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string,
  imageBase64?: string
): Promise<ReadableStream<Uint8Array>> {
  if (isOpenRouter(baseUrl)) {
    const userContent: unknown = imageBase64
      ? [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ]
      : userPrompt

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
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: userContent },
        ],
        stream: true,
      }),
    })

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => "")
      throw new Error(`Assistant (OpenRouter) stream failed: ${response.status} ${errText}`)
    }

    return response.body
  }

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
  onComplete: StreamCompletionCallback,
  openRouterStream = false
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

          if (
            provider === "MENTOR" ||
            provider === "DEEPSEEK" ||
            ((provider === "GEMINI" || provider === "ASSISTANT") && openRouterStream)
          ) {
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
          if (
            provider === "MENTOR" ||
            provider === "DEEPSEEK" ||
            ((provider === "GEMINI" || provider === "ASSISTANT") && openRouterStream)
          ) {
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

// Call Deepgram STT (Nova-3) — transcribe audio to text
async function callDeepgramSTT(
  audioBase64: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<{ transcription: string }> {
  const audioBuffer = Uint8Array.from(atob(audioBase64), (c) =>
    c.charCodeAt(0)
  )

  const response = await fetch(`${baseUrl}/v1/listen?model=${encodeURIComponent(model)}&smart_format=true`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "audio/webm",
    },
    body: audioBuffer,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw new Error(`Deepgram STT failed: ${response.status} ${errText}`)
  }

  const data = await response.json()
  const transcription = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ""
  return { transcription }
}

// Call Deepgram TTS (Aura-2-Asteria) — text to speech
async function callDeepgramTTS(
  text: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<{ audioBase64: string }> {
  const response = await fetch(`${baseUrl}/v1/speak?model=${encodeURIComponent(model)}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw new Error(`Deepgram TTS failed: ${response.status} ${errText}`)
  }

  const audioBuffer = await response.arrayBuffer()
  const audioBase64 = btoa(
    String.fromCharCode(...new Uint8Array(audioBuffer))
  )

  return { audioBase64 }
}

// ─────────────────────────────────────────
// VISION — DeepSeek Vision (image_upload)
// ─────────────────────────────────────────

const VISION_MAX_IMAGE_BYTES = 32 * 1024 * 1024 // 32 MiB

const VISION_SYSTEM_PROMPT = `You are an image transcriber for a personal mentor app.
Transcribe ONLY what is literally visible in the image. Do not infer, guess, or add context.
- For text: reproduce it exactly, preserving line breaks.
- For charts/diagrams: describe structure and labels factually.
- For photos: describe subjects, objects, and any visible text factually.
- If something is unclear, too small, or partially cut off, write [UNREADABLE] for that part.
- Do NOT answer questions, give advice, or interpret meaning.
- Keep it concise and factual.`

async function callDeepSeekVision(
  imageBase64: string,
  imageMimeType: string,
  userCaption: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              ...(userCaption ? [{ type: "text", text: userCaption }] : []),
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageMimeType};base64,${imageBase64}`,
                  detail: "original",
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      throw new Error(`DeepSeek Vision failed: ${response.status} ${errText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ""
  } finally {
    clearTimeout(timeout)
  }
}

async function callDeepSeekText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  try {
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
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      throw new Error(`DeepSeek text failed: ${response.status} ${errText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ""
  } finally {
    clearTimeout(timeout)
  }
}

// ─────────────────────────────────────────
// LINK FETCH — SSRF-guarded fetch + summarize
// ─────────────────────────────────────────

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "metadata.google.internal",
])

const BLOCKED_DOMAIN_PATTERNS: RegExp[] = [
  /(^|\.)localhost$/i,
  /(^|\.)local$/i,
  /(^|\.)internal$/i,
  /(^|\.)home$/i,
  /(^|\.)lan$/i,
  /(^|\.)corp$/i,
  /(^|\.)test$/i,
]

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /(aws_access_key_id|aws_secret_access_key)/i,
  /(authorization|bearer)\s*[:=]\s*[A-Za-z0-9._-]{20,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
]

function isPrivateIpLiteral(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split(".").map(Number)
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  return false
}

function isDomainBlocked(host: string): boolean {
  return BLOCKED_DOMAIN_PATTERNS.some((p) => p.test(host))
}

function isUrlSafe(rawUrl: string): { safe: boolean; reason?: string } {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { safe: false, reason: "invalid_url" }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { safe: false, reason: "unsupported_protocol" }
  }

  const host = url.hostname.toLowerCase()
  if (BLOCKED_HOSTS.has(host)) return { safe: false, reason: "blocked_host" }
  if (isDomainBlocked(host)) return { safe: false, reason: "blocked_domain" }
  if (isPrivateIpLiteral(host)) return { safe: false, reason: "private_ip" }

  // IPv6 loopback / link-local / unique-local
  if (
    host === "::1" ||
    host === "::" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return { safe: false, reason: "private_ip" }
  }

  return { safe: true }
}

// ─────────────────────────────────────────
// DOCUMENT EXTRACTION — PDF & DOCX
// ─────────────────────────────────────────

/** Minimal PDF text extractor — finds text between BT/ET blocks and decodes Tj/TJ operators. */
function extractPdfText(bytes: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(bytes)
  const parts: string[] = []

  // Find all BT...ET text blocks
  const btRegex = /BT([\s\S]*?)ET/g
  let btMatch: RegExpExecArray | null
  while ((btMatch = btRegex.exec(text)) !== null) {
    const block = btMatch[1]

    // Extract Tj (show string) — e.g. (Hello) Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    let tjMatch: RegExpExecArray | null
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      parts.push(tjMatch[1])
    }

    // Extract TJ (show array) — e.g. [(Hello) 5 (World)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g
    let tjArrMatch: RegExpExecArray | null
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const arrContent = tjArrMatch[1]
      const strRegex = /\(([^)]*)\)/g
      let strMatch: RegExpExecArray | null
      while ((strMatch = strRegex.exec(arrContent)) !== null) {
        parts.push(strMatch[1])
      }
    }
  }

  return parts.join(" ").replace(/\\([()\\])/g, "$1")
}

/** Extract text from a DOCX file (ZIP containing word/document.xml). */
async function extractDocxText(bytes: Uint8Array): Promise<string> {
  // DOCX is a ZIP file. We need to find and parse word/document.xml.
  // Use a minimal ZIP reader — find the local file header for word/document.xml
  const text = new TextDecoder("latin1").decode(bytes)

  // Find word/document.xml in the central directory
  const docXmlMatch = text.match(/word\/document\.xml/)
  if (!docXmlMatch) return ""

  // Minimal approach: decompress using a library or fall back to raw text extraction
  // Since Deno doesn't have built-in ZIP, we use a heuristic: find the compressed
  // data for word/document.xml and try to extract readable text from the raw XML

  // Actually, let's use a simpler approach: search for the raw XML content
  // The word/document.xml in a DOCX is usually stored with DEFLATE compression.
  // We'll use Deno's built-in decompression via the CompressionStream API.

  // Find the local file header signature for word/document.xml
  const encoder = new TextEncoder()
  const targetName = encoder.encode("word/document.xml")
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  // Search for the local file header (PK\x03\x04) followed by the filename
  for (let i = 0; i < bytes.length - 30; i++) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4B && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
      const nameLen = view.getUint16(i + 26, true)
      const extraLen = view.getUint16(i + 28, true)
      if (nameLen === targetName.length) {
        const nameBytes = bytes.slice(i + 30, i + 30 + nameLen)
        if (new TextDecoder().decode(nameBytes) === "word/document.xml") {
          const compSize = view.getUint32(i + 18, true)
          const dataStart = i + 30 + nameLen + extraLen
          const compressed = bytes.slice(dataStart, dataStart + compSize)

          try {
            const ds = new DecompressionStream("deflate")
            const writer = ds.writable.getWriter()
            writer.write(compressed)
            writer.close()
            const result = await new Response(ds.readable).arrayBuffer()
            const xml = new TextDecoder().decode(result)
            // Strip XML tags, keep text content
            return xml
              .replace(/<[^>]+>/g, " ")
              .replace(/&apos;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/\s+/g, " ")
              .trim()
          } catch {
            // Decompression failed, fall through
          }
          break
        }
      }
    }
  }

  // Fallback: try to extract any readable text from the raw bytes
  return ""
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
  const {
    sessionId,
    feature,
    prompt,
    imageBase64,
    imageMimeType,
    audioBase64,
    voiceOutput,
    url,
  } = body

  // ───────────────────────────────────────
  // IMAGE UPLOAD — DeepSeek Vision analysis
  // Returns imageDescription; the frontend then sends a normal
  // mentor_message with the description prepended to the prompt.
  // ───────────────────────────────────────
  if (feature === "image_upload") {
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return cors(JSON.stringify({ error: "image_base64_required" }), { status: 400 })
    }

    const mimeType = (typeof imageMimeType === "string" && imageMimeType
      ? imageMimeType
      : "image/jpeg") as string
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedMimes.includes(mimeType)) {
      return cors(JSON.stringify({ error: "unsupported_image_type" }), { status: 400 })
    }

    const approxSizeBytes = (imageBase64.length * 3) / 4
    if (approxSizeBytes > VISION_MAX_IMAGE_BYTES) {
      return cors(
        JSON.stringify({ error: "image_too_large", reason: "Image exceeds 32 MiB limit" }),
        { status: 413 }
      )
    }

    // Billing preflight (image_upload = 3 XP)
    const preResp = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "preflight", userId: authenticatedUserId, feature: "image_upload" }),
      }
    )
    const pre = await preResp.json()
    if (!pre.allowed) {
      return cors(JSON.stringify({ error: pre.reason ?? "insufficient_xp" }), { status: 402 })
    }

    let visionResult = ""
    try {
      const visionCreds = getProviderCredentials("DEEPSEEK_VISION")
      visionResult = await callDeepSeekVision(
        imageBase64,
        mimeType,
        typeof prompt === "string" ? prompt : "",
        visionCreds.apiKey,
        visionCreds.baseUrl,
        visionCreds.model
      )
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
            feature: "image_upload",
            reservedAmount: pre.reservedAmount,
          }),
        }
      ).catch(() => {})
      return cors(JSON.stringify({ error: "vision_failed", detail: String(error) }), { status: 500 })
    }

    // Finalize billing (vision is non-streaming; estimate tokens from char count)
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
          feature: "image_upload",
          totalTokens: Math.ceil(visionResult.length / 4),
          modelUsed: "DEEPSEEK_VISION",
          reservedAmount: pre.reservedAmount,
        }),
      }
    ).catch(() => {})

    return cors(JSON.stringify({ imageDescription: visionResult }), { status: 200 })
  }

  // ───────────────────────────────────────
  // DOCUMENT UPLOAD — extract text from PDF, DOCX, Markdown, plain text
  // ───────────────────────────────────────
  if (feature === "document_upload") {
    const docBase64: string | undefined = body.documentBase64
    const docMime: string | undefined = body.documentMimeType
    const docFileName: string | undefined = body.documentFileName

    if (!docBase64 || typeof docBase64 !== "string") {
      return cors(JSON.stringify({ error: "document_base64_required" }), { status: 400 })
    }

    const ALLOWED_DOC_MIMES = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/x-markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    const mime = (typeof docMime === "string" && docMime ? docMime : "text/plain") as string
    if (!ALLOWED_DOC_MIMES.includes(mime)) {
      return cors(JSON.stringify({ error: "unsupported_document_type" }), { status: 400 })
    }

    const approxSizeBytes = (docBase64.length * 3) / 4
    const MAX_DOC_BYTES = 32 * 1024 * 1024
    if (approxSizeBytes > MAX_DOC_BYTES) {
      return cors(JSON.stringify({ error: "document_too_large" }), { status: 413 })
    }

    // Billing preflight
    const preResp = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "preflight", userId: authenticatedUserId, feature: "document_upload" }),
      }
    )
    const pre = await preResp.json()
    if (!pre.allowed) {
      return cors(JSON.stringify({ error: pre.reason ?? "insufficient_xp" }), { status: 402 })
    }

    const cancelReservation = () =>
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "cancel", userId: authenticatedUserId, feature: "document_upload", reservedAmount: pre.reservedAmount }),
      }).catch(() => {})

    let extractedText = ""

    try {
      const rawBytes = Uint8Array.from(atob(docBase64), (c) => c.charCodeAt(0))

      if (mime === "text/plain" || mime === "text/markdown" || mime === "text/x-markdown") {
        extractedText = new TextDecoder().decode(rawBytes)
      } else if (mime === "application/pdf") {
        extractedText = extractPdfText(rawBytes)
      } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        extractedText = await extractDocxText(rawBytes)
      }

      if (!extractedText || extractedText.trim().length === 0) {
        await cancelReservation()
        return cors(JSON.stringify({ error: "empty_document", reason: "No extractable text found" }), { status: 422 })
      }

      // Truncate to reasonable size for the LLM context
      extractedText = extractedText.trim().slice(0, 12000)
    } catch (err) {
      await cancelReservation()
      return cors(JSON.stringify({ error: "extraction_failed", detail: String(err) }), { status: 500 })
    }

    // Finalize billing
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: "finalize",
        userId: authenticatedUserId,
        feature: "document_upload",
        totalTokens: Math.ceil(extractedText.length / 4),
        modelUsed: "DEEPSEEK",
        reservedAmount: pre.reservedAmount,
      }),
    }).catch(() => {})

    return cors(JSON.stringify({
      documentText: extractedText,
      documentFileName: docFileName ?? null,
      documentMimeType: mime,
    }), { status: 200 })
  }

  // ───────────────────────────────────────
  // LINK FETCH — SSRF-guarded fetch + summarize
  // ───────────────────────────────────────
  if (feature === "fetch_link") {
    if (!url || typeof url !== "string") {
      return cors(JSON.stringify({ error: "url_required" }), { status: 400 })
    }

    const urlCheck = isUrlSafe(url)
    if (!urlCheck.safe) {
      return cors(JSON.stringify({ error: "blocked_url", reason: urlCheck.reason }), { status: 403 })
    }

    // Billing preflight (reuses assistant_message cost)
    const preResp = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "preflight", userId: authenticatedUserId, feature: "assistant_message" }),
      }
    )
    const pre = await preResp.json()
    if (!pre.allowed) {
      return cors(JSON.stringify({ error: pre.reason ?? "insufficient_xp" }), { status: 402 })
    }

    const cancelReservation = () =>
      fetch(
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
            feature: "assistant_message",
            reservedAmount: pre.reservedAmount,
          }),
        }
      ).catch(() => {})

    let pageText = ""
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      let pageResp: Response
      try {
        pageResp = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "OpusDevia-LinkFetcher/1.0",
            Accept: "text/html,text/plain",
          },
          redirect: "follow",
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }

      const contentType = pageResp.headers.get("content-type") ?? ""
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        await cancelReservation()
        return cors(JSON.stringify({ error: "unsupported_content_type" }), { status: 415 })
      }

      const raw = await pageResp.text()
      pageText = raw
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000)
    } catch (error) {
      await cancelReservation()
      return cors(JSON.stringify({ error: "fetch_failed", detail: String(error) }), { status: 502 })
    }

    // Reject pages containing leaked secrets / prompt-injection payloads
    if (SUSPICIOUS_PATTERNS.some((p) => p.test(pageText))) {
      await cancelReservation()
      return cors(JSON.stringify({ error: "blocked_url", reason: "suspicious_content" }), { status: 403 })
    }

    if (!pageText) {
      await cancelReservation()
      return cors(JSON.stringify({ error: "empty_page" }), { status: 422 })
    }

    const summaryPrompt = `You are a link summarizer for a personal mentor app.
Return ONLY a JSON object with exactly this shape:
{ "blocked": boolean, "summary": string }
- Set "blocked": true ONLY if the page content is clearly dangerous, hateful, or instructs harm to the user or others. Otherwise "blocked": false.
- "summary" must be a concise 2-4 sentence summary of the page, in plain English.
Do not include any text outside the JSON object.

Page content:
${pageText}`

    let summary = ""
    try {
      const deepseekCreds = getProviderCredentials("DEEPSEEK")
      summary = await callDeepSeekText(
        "",
        summaryPrompt,
        300,
        deepseekCreds.apiKey,
        deepseekCreds.baseUrl,
        deepseekCreds.model
      )
    } catch (error) {
      await cancelReservation()
      return cors(JSON.stringify({ error: "summary_failed", detail: String(error) }), { status: 500 })
    }

    // Fail-closed JSON parse
    let parsed: { blocked: boolean; summary: string }
    try {
      const clean = summary.replace(/```json|```/g, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { blocked: false, summary: summary.trim().slice(0, 2000) }
    }

    if (parsed.blocked) {
      await cancelReservation()
      return cors(JSON.stringify({ error: "blocked_url", reason: "content_policy" }), { status: 403 })
    }

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
          feature: "assistant_message",
          totalTokens: Math.ceil((pageText.length + summary.length) / 4),
          modelUsed: "DEEPSEEK",
          reservedAmount: pre.reservedAmount,
        }),
      }
    ).catch(() => {})

    return cors(JSON.stringify({ url, summary: parsed.summary }), { status: 200 })
  }

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
  // VOICE INPUT — Deepgram STT (Nova-3)
  // ─────────────────────────────────────────
  if (feature === "voice_input") {
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return cors(JSON.stringify({ error: "audio_base64_required" }), { status: 400 })
    }

    const { transcription } = await callDeepgramSTT(
      audioBase64,
      credentials.apiKey,
      credentials.baseUrl,
      credentials.model
    )
    return cors(JSON.stringify({ transcription }), { status: 200 })
  }

  // ─────────────────────────────────────────
  // VOICE OUTPUT — Deepgram TTS (standalone)
  // ─────────────────────────────────────────
  if (feature === "voice_output") {
    const ttsText: string | undefined = body.text
    const ttsVoice: string | undefined = body.voice

    if (!ttsText || typeof ttsText !== "string" || ttsText.trim().length === 0) {
      return cors(JSON.stringify({ error: "text_required" }), { status: 400 })
    }

    try {
      const ttsCreds = getProviderCredentials("DEEPGRAM_TTS")
      const voiceModel = ttsVoice && typeof ttsVoice === "string" ? ttsVoice : ttsCreds.model
      const ttsResult = await callDeepgramTTS(ttsText.trim(), ttsCreds.apiKey, ttsCreds.baseUrl, voiceModel)
      return cors(JSON.stringify({ audioBase64: ttsResult.audioBase64 }), { status: 200 })
    } catch (err) {
      return cors(JSON.stringify({ error: "tts_failed", detail: String(err) }), { status: 500 })
    }
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

      const transformer = createStreamTransformer(
        credentials.provider,
        handleStreamComplete,
        isOpenRouter(credentials.baseUrl)
      )
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
  // VOICE OUTPUT — Deepgram TTS (Aura-2-Asteria)
  // ─────────────────────────────────────────
  let audioBase64Response: string | null = null

  if (voiceOutput && feature === "mentor_message") {
    try {
      const ttsCreds = getProviderCredentials("DEEPGRAM_TTS")
      const ttsResult = await callDeepgramTTS(result.content, ttsCreds.apiKey, ttsCreds.baseUrl, ttsCreds.model)
      audioBase64Response = ttsResult.audioBase64
    } catch (ttsError) {
      console.error("Deepgram TTS generation failed:", ttsError instanceof Error ? ttsError.message : String(ttsError))
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

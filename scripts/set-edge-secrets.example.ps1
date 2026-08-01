# =============================================================================
# Set Supabase Edge Function secrets (DO NOT commit filled version)
# =============================================================================
# 1. Copy this file to set-edge-secrets.local.ps1 (gitignored via .env.* pattern)
# 2. Fill in your values locally — never commit the .local.ps1 file
# 3. Run: .\scripts\set-edge-secrets.local.ps1
#
# Requires Supabase CLI linked to project fcewxusbwcynwpgkaunt:
#   npx supabase login
#   npx supabase link --project-ref fcewxusbwcynwpgkaunt
# =============================================================================

$ErrorActionPreference = "Stop"

# ── 1. Mentor — DeepSeek V4 Pro ──────────────────────────────────────────────
$MENTOR_API_KEY    = "REPLACE_ME"
$MENTOR_BASE_URL   = "REPLACE_ME"
$MENTOR_MODEL      = "REPLACE_ME"

# ── 2. Assistant — Gemini 2.0 Flash ────────────────────────────────────────
$ASSISTANT_API_KEY  = "REPLACE_ME"
$ASSISTANT_BASE_URL = "REPLACE_ME"
$ASSISTANT_MODEL    = "REPLACE_ME"

# ── 3. Reviews — Gemini 2.5 Flash ────────────────────────────────────────────
$GEMINI_API_KEY    = "REPLACE_ME"
$GEMINI_BASE_URL   = "REPLACE_ME"
$GEMINI_MODEL      = "REPLACE_ME"

# ── 4. Background — DeepSeek V4 Flash ────────────────────────────────────────
$DEEPSEEK_API_KEY  = "REPLACE_ME"
$DEEPSEEK_BASE_URL = "REPLACE_ME"
$DEEPSEEK_MODEL    = "REPLACE_ME"

# ── 5. OpenAI TTS ────────────────────────────────────────────────────────────
$OPENAI_API_KEY    = "REPLACE_ME"

# ── 6. OpenAI Whisper ────────────────────────────────────────────────────────
$OPENAI_2_API_KEY  = "REPLACE_ME"

Write-Host "Setting Edge Function secrets on Supabase (values not printed)..."

npx supabase secrets set `
  MENTOR_API_KEY="$MENTOR_API_KEY" `
  MENTOR_BASE_URL="$MENTOR_BASE_URL" `
  MENTOR_MODEL="$MENTOR_MODEL" `
  ASSISTANT_API_KEY="$ASSISTANT_API_KEY" `
  ASSISTANT_BASE_URL="$ASSISTANT_BASE_URL" `
  ASSISTANT_MODEL="$ASSISTANT_MODEL" `
  GEMINI_API_KEY="$GEMINI_API_KEY" `
  GEMINI_BASE_URL="$GEMINI_BASE_URL" `
  GEMINI_MODEL="$GEMINI_MODEL" `
  DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" `
  DEEPSEEK_BASE_URL="$DEEPSEEK_BASE_URL" `
  DEEPSEEK_MODEL="$DEEPSEEK_MODEL" `
  OPENAI_API_KEY="$OPENAI_API_KEY" `
  OPENAI_2_API_KEY="$OPENAI_2_API_KEY"

Write-Host "Done. Deploy functions: npx supabase functions deploy ai-health"

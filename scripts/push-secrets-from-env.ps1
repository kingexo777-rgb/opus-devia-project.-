# Push .env.local secrets to Supabase Edge Functions (canonical env names).
# Values are never printed. Requires: npx supabase login + link (or --project-ref).

$ErrorActionPreference = "Stop"
$ProjectRef = "fcewxusbwcynwpgkaunt"
$Root = Split-Path $PSScriptRoot -Parent
$EnvFile = Join-Path $Root ".env.local"

if (-not (Test-Path $EnvFile)) {
  Write-Error ".env.local not found at $EnvFile"
}

# Parse .env.local into hashtable
$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  if ($line -match '^([^=]+)=(.*)$') {
    $key = $matches[1].Trim()
    $val = $matches[2].Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    $vars[$key] = $val
  }
}

function Get-Var {
  param([string[]]$Names)
  foreach ($n in $Names) {
    if ($vars.ContainsKey($n) -and $vars[$n]) { return $vars[$n] }
  }
  return $null
}

# Map to canonical Supabase secret names (loader accepts both at runtime)
$canonical = [ordered]@{
  MENTOR_API_KEY       = @("MENTOR_API_KEY")
  MENTOR_BASE_URL      = @("MENTOR_BASE_URL", "MENTOR_API_BASE_URL")
  MENTOR_MODEL         = @("MENTOR_MODEL")
  ASSISTANT_API_KEY    = @("ASSISTANT_API_KEY")
  ASSISTANT_BASE_URL   = @("ASSISTANT_BASE_URL", "ASSISTANT_API_BASE_URL")
  ASSISTANT_MODEL      = @("ASSISTANT_MODEL")
  GEMINI_API_KEY       = @("GEMINI_API_KEY")
  GEMINI_BASE_URL      = @("GEMINI_BASE_URL", "GEMINI_API_BASE_URL")
  GEMINI_MODEL         = @("GEMINI_MODEL")
  DEEPSEEK_API_KEY     = @("DEEPSEEK_API_KEY")
  DEEPSEEK_BASE_URL    = @("DEEPSEEK_BASE_URL", "DEEPSEEK_API_BASE_URL")
  DEEPSEEK_MODEL       = @("DEEPSEEK_MODEL")
  OPENAI_API_KEY       = @("OPENAI_API_KEY")
  OPENAI_BASE_URL      = @("OPENAI_BASE_URL", "OPENAI_API_BASE_URL")
  OPENAI_2_API_KEY     = @("OPENAI_2_API_KEY")
  OPENAI_2_BASE_URL    = @("OPENAI_2_BASE_URL", "OPENAI_2_API_BASE_URL", "OPENAI_API_BASE_URL")
  # SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase — do not push
}

$missing = @()
$secretArgs = @()

foreach ($entry in $canonical.GetEnumerator()) {
  $value = Get-Var -Names $entry.Value
  if (-not $value) {
    if ($entry.Key -in @("OPENAI_BASE_URL", "OPENAI_2_BASE_URL")) { continue }
    $missing += $entry.Key
    continue
  }
  $secretArgs += "$($entry.Key)=$value"
}

if ($missing.Count -gt 0) {
  Write-Error "Missing required values in .env.local for: $($missing -join ', ')"
}

Write-Host "Pushing $($secretArgs.Count) secrets to Supabase project $ProjectRef (values hidden)..."

$accessToken = Get-Var -Names @("SUPABASE_ACCESS_TOKEN")
if (-not $accessToken) {
  Write-Error "Add SUPABASE_ACCESS_TOKEN to .env.local (create at https://supabase.com/dashboard/account/tokens) then re-run this script."
}
$env:SUPABASE_ACCESS_TOKEN = $accessToken

$SupabaseBin = Join-Path $Root ".bin\supabase.exe"
if (-not (Test-Path $SupabaseBin)) {
  $SupabaseBin = "supabase"
}

& $SupabaseBin secrets set @secretArgs --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
  Write-Error "supabase secrets set failed. Install CLI: winget install Supabase.cli  OR run scripts/install-supabase-cli.ps1"
}

Write-Host "Secrets pushed successfully."

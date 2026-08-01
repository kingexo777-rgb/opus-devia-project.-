# One-time: download Supabase CLI to .bin/ (gitignored)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$BinDir = Join-Path $Root ".bin"
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

$Tgz = Join-Path $env:TEMP "supabase_windows_amd64.tar.gz"
Write-Host "Downloading Supabase CLI..."
Invoke-WebRequest -Uri "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz" -OutFile $Tgz -UseBasicParsing
tar -xzf $Tgz -C $BinDir supabase.exe
Write-Host "Installed: $BinDir\supabase.exe"
& "$BinDir\supabase.exe" --version

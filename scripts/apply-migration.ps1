# Apply migration SQL to Supabase project
# Usage: .\scripts\apply-migration.ps1

$ProjectUrl = "https://fcewxusbwcynwpgkaunt.supabase.co"
$ServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjZXd4dXNid2N5bndwZ2thdW50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE1MTkwNywiZXhwIjoyMDk1NzI3OTA3fQ.uoEXdqPkPPbsE-e8BNHrBGNlTGYihb-t0xpJKpJNEWw"
$MigrationFile = Join-Path $PSScriptRoot "..\supabase\migrations\20260606160000_xp_reservations_and_dead_letter.sql"

$Sql = Get-Content $MigrationFile -Raw

Write-Host "Applying migration..."

# Use Supabase Management API SQL endpoint
$Body = @{ query = $Sql } | ConvertTo-Json -Depth 10

$Response = Invoke-RestMethod `
    -Uri "https://api.supabase.com/v1/projects/fcewxusbwcynwpgkaunt/database/query" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer sbp_075f2d099fee3bfd35e54c6562479d7a70a9d6ff"
        "Content-Type" = "application/json"
    } `
    -Body $Body

Write-Host "Migration applied successfully!"
$Response
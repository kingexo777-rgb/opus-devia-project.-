# Agent Guide for `kin` Workspace

This workspace contains Supabase Edge Function secrets, local environment configuration, and helper scripts for managing API keys.

## Key guidance for API key work

- Do not hardcode API keys, service tokens, or secret values in source files.
- Use `.env.example` as the canonical reference for required environment variables.
- Keep actual secrets in `.env.local` only, and never commit `.env.local` to Git.
- Avoid copying secret values into chat logs or AI prompts.

## Secret management conventions

- Local development secrets are loaded from `.env.local`.
- Use `scripts/push-secrets-from-env.ps1` or `scripts/set-edge-secrets.example.ps1` to push secrets into Supabase Edge Functions.
- In production, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase and should not be pushed manually.

## Provider-specific API key patterns

- Model providers use `*_API_KEY`, `*_BASE_URL`, and `*_MODEL` variables.
- Accepted provider names include `MENTOR`, `ASSISTANT`, `GEMINI`, `DEEPSEEK`, `OPENAI`, and `OPENAI_2`.
- The scripts support aliases like `OPENAI_API_BASE_URL` and `OPENAI_2_API_BASE_URL`.

## When editing code

- Prefer environment variable lookups and secret loading logic over inline keys.
- If adding new provider support, keep secret names consistent with the patterns in `supabase/functions/_shared/governance/constants.ts`.
- Do not expose API keys in logs, test output, or error messages.

## Useful references

- `.env.example` — canonical env names and local secret guidance.
- `scripts/push-secrets-from-env.ps1` — pushes local secrets to Supabase.
- `scripts/set-edge-secrets.example.ps1` — example PowerShell flow for setting secrets.
- `supabase/functions/_shared/governance/constants.ts` — runtime secret mapping for AI model providers.

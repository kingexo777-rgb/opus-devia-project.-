/// <reference lib="deno.ns" />
/**
 * AI secrets health check — verifies all model env vars are configured.
 * Returns redacted summary only (no API key values).
 *
 * Deploy: supabase functions deploy ai-health
 * Invoke (service role): POST /functions/v1/ai-health
 */

import {
  secretsHealthSummary,
  validateAllModelSecrets,
} from "../_shared/governance/model-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Service role only — never expose secret config to anon clients
  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const validation = validateAllModelSecrets();
  const summary = secretsHealthSummary();

  return new Response(
    JSON.stringify({
      ok: validation.ok,
      missing: validation.missing,
      providers: summary,
      timestamp: new Date().toISOString(),
    }),
    {
      status: validation.ok ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

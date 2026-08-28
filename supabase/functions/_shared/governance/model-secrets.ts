/**
 * Secure model secret loader — SERVER SIDE ONLY (Edge Functions).
 * Reads from Deno.env / Supabase Edge secrets. Never log key values.
 */

import {
  GOVERNANCE,
  type FeatureRole,
  type ModelProviderId,
  resolveProviderForFeature,
} from "./constants.ts";

export interface ResolvedModelCredentials {
  provider: ModelProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  voice?: string;
}

export class ModelSecretsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelSecretsError";
  }
}

function readEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new ModelSecretsError(`Missing required secret: ${name}`);
  }
  return value;
}

function readEnvOptional(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim();
  return value || undefined;
}

/** Accept canonical env names and legacy *_API_BASE_URL aliases. */
function readEnvFirst(names: string[]): string {
  for (const name of names) {
    const value = readEnvOptional(name);
    if (value) return value;
  }
  throw new ModelSecretsError(
    `Missing required secret (tried: ${names.join(", ")})`,
  );
}

function readEnvFirstOptional(
  names: string[],
  fallback: string,
): string {
  for (const name of names) {
    const value = readEnvOptional(name);
    if (value) return value;
  }
  return fallback;
}

const BASE_URL_ALIASES: Record<string, string[]> = {
  MENTOR_BASE_URL: ["MENTOR_BASE_URL", "MENTOR_API_BASE_URL"],
  ASSISTANT_BASE_URL: ["ASSISTANT_BASE_URL", "ASSISTANT_API_BASE_URL"],
  GEMINI_BASE_URL: ["GEMINI_BASE_URL", "GEMINI_API_BASE_URL"],
  DEEPSEEK_BASE_URL: ["DEEPSEEK_BASE_URL", "DEEPSEEK_API_BASE_URL"],
  DEEPSEEK_VISION_BASE_URL: ["DEEPSEEK_VISION_BASE_URL"],
  DEEPGRAM_BASE_URL: ["DEEPGRAM_BASE_URL"],
};

function readBaseUrl(canonical: keyof typeof BASE_URL_ALIASES): string {
  return readEnvFirst(BASE_URL_ALIASES[canonical]);
}

/** Load credentials for a provider. Keys never returned in logs/errors beyond env name. */
export function getProviderCredentials(
  providerId: ModelProviderId,
): ResolvedModelCredentials {
  const config = GOVERNANCE.MODELS[providerId];

  switch (providerId) {
    case "DEEPGRAM_STT": {
      return {
        provider: providerId,
        apiKey: readEnv(config.apiKeyVar),
        baseUrl: readEnvFirstOptional(
          BASE_URL_ALIASES.DEEPGRAM_BASE_URL,
          "https://api.deepgram.com",
        ),
        model: readEnv(config.modelVar),
      };
    }
    case "DEEPGRAM_TTS": {
      return {
        provider: providerId,
        apiKey: readEnv(config.apiKeyVar),
        baseUrl: readEnvFirstOptional(
          BASE_URL_ALIASES.DEEPGRAM_BASE_URL,
          "https://api.deepgram.com",
        ),
        model: readEnv(config.modelVar),
      };
    }
    default: {
      const c = config as {
        apiKeyVar: string;
        baseUrlVar: string;
        modelVar: string;
      };
      return {
        provider: providerId,
        apiKey: readEnv(c.apiKeyVar),
        baseUrl: readBaseUrl(c.baseUrlVar as keyof typeof BASE_URL_ALIASES),
        model: readEnv(c.modelVar),
      };
    }
  }
}

/** Resolve feature → provider → credentials (router entry point). */
export function getCredentialsForFeature(
  feature: FeatureRole,
): ResolvedModelCredentials {
  const providerId = resolveProviderForFeature(feature);
  if (!providerId) {
    throw new ModelSecretsError(`No model mapped for feature: ${feature}`);
  }
  return getProviderCredentials(providerId);
}

/** Validate all AI secrets exist at cold start. Logs provider names only. */
export function validateAllModelSecrets(): {
  ok: boolean;
  providers: ModelProviderId[];
  missing: string[];
} {
  const providers: ModelProviderId[] = [
    "MENTOR",
    "ASSISTANT",
    "GEMINI",
    "DEEPSEEK",
    "DEEPSEEK_VISION",
    "DEEPGRAM_STT",
    "DEEPGRAM_TTS",
  ];
  const missing: string[] = [];

  for (const providerId of providers) {
    try {
      getProviderCredentials(providerId);
    } catch (e) {
      if (e instanceof ModelSecretsError) {
        missing.push(e.message);
      } else {
        missing.push(`Unknown error loading ${providerId}`);
      }
    }
  }

  return { ok: missing.length === 0, providers, missing };
}

/** Redacted summary for health checks — safe to log. */
export function secretsHealthSummary(): Record<
  ModelProviderId,
  { configured: boolean; model: string; baseUrlHost: string }
> {
  const result = {} as Record<
    ModelProviderId,
    { configured: boolean; model: string; baseUrlHost: string }
  >;

  for (const providerId of [
    "MENTOR",
    "ASSISTANT",
    "GEMINI",
    "DEEPSEEK",
    "DEEPSEEK_VISION",
    "DEEPGRAM_STT",
    "DEEPGRAM_TTS",
  ] as ModelProviderId[]) {
    try {
      const creds = getProviderCredentials(providerId);
      let host = "unknown";
      try {
        host = new URL(creds.baseUrl).host;
      } catch {
        host = "[invalid-url]";
      }
      result[providerId] = {
        configured: true,
        model: creds.model,
        baseUrlHost: host,
      };
    } catch {
      result[providerId] = {
        configured: false,
        model: "",
        baseUrlHost: "",
      };
    }
  }

  return result;
}

/** Env var names required for Supabase secrets setup (no values). */
export const REQUIRED_SECRET_ENV_VARS = [
  "MENTOR_API_KEY",
  "MENTOR_BASE_URL",
  "MENTOR_MODEL",
  "ASSISTANT_API_KEY",
  "ASSISTANT_BASE_URL",
  "ASSISTANT_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_BASE_URL",
  "GEMINI_MODEL",
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_MODEL",
  "DEEPSEEK_VISION_API_KEY",
  "DEEPSEEK_VISION_BASE_URL",
  "DEEPSEEK_VISION_MODEL",
  "DEEPGRAM_API_KEY",
  "DEEPGRAM_BASE_URL",
  "DEEPGRAM_MODEL",
  "DEEPGRAM_API_KEY_OUTPUT",
  "DEEPGRAM_MODEL_OUTPUT",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

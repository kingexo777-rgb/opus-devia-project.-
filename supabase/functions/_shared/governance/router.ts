/**
 * AI request router — enforces governance before any model call.
 */

import {
  GOVERNANCE,
  type FeatureRole,
  tierAllowsFeature,
  resolveProviderForFeature,
} from "./constants.ts";
import {
  getCredentialsForFeature,
  type ResolvedModelCredentials,
} from "./model-secrets.ts";
import {
  buildAssistantSystemPrompt,
  buildMentorSystemPrompt,
  buildReviewSystemPrompt,
  INTENT_DETECTION_PROMPT,
} from "./system-prompts.ts";

export class GovernanceViolationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "GovernanceViolationError";
  }
}

export interface RouteRequest {
  feature: FeatureRole;
  userTier: "free" | "builder" | "operator" | "founder";
  sessionType?: "mentor" | "assistant" | "mixed";
  assertivenessLevel?: number;
  userData?: Record<string, unknown>;
  assistantTone?: string;
  shelf?: unknown;
  preloadedData?: unknown;
  periodType?: string;
  periodData?: unknown;
}

export interface RouteResult {
  provider: ResolvedModelCredentials["provider"];
  credentials: ResolvedModelCredentials;
  systemPrompt: string;
  requiresIntentDetectionFirst: boolean;
  requiresUserPermission: boolean;
  backgroundJob: boolean;
}

export function routeAIRequest(req: RouteRequest): RouteResult {
  // Rule 1: feature → model mapping
  const providerId = resolveProviderForFeature(req.feature);
  if (!providerId) {
    throw new GovernanceViolationError(
      "unknown_feature",
      `No model mapped for feature: ${req.feature}`,
    );
  }

  const modelConfig = GOVERNANCE.MODELS[providerId];

  // Rule 2: tier gate
  if (!tierAllowsFeature(req.userTier, req.feature)) {
    throw new GovernanceViolationError(
      "feature_not_available",
      `Tier ${req.userTier} cannot use feature ${req.feature}`,
    );
  }

  // Voice scope rules
  if (req.feature === "voice_input" && req.sessionType !== "mentor") {
    throw new GovernanceViolationError(
      "voice_scope_violation",
      "Whisper is mentor sessions only",
    );
  }

  if (
    req.feature === "voice_output" &&
    req.sessionType &&
    req.sessionType !== "mentor"
  ) {
    throw new GovernanceViolationError(
      "voice_scope_violation",
      "TTS is mentor responses only",
    );
  }

  const credentials = getCredentialsForFeature(req.feature);

  let systemPrompt = "";
  let requiresIntentDetectionFirst = false;
  let requiresUserPermission = false;

  if (req.feature === "mentor_message") {
    systemPrompt = buildMentorSystemPrompt(
      req.assertivenessLevel ?? 3,
      req.userData ?? {},
    );
  } else if (
    [
      "assistant_message",
      "roadmap_assistant_message",
      "journal_assistant_message",
      "image_upload",
    ].includes(req.feature)
  ) {
    requiresIntentDetectionFirst = true;
    requiresUserPermission = true;
    systemPrompt = buildAssistantSystemPrompt(
      req.assistantTone ?? "standard",
      req.shelf ?? {},
      req.preloadedData ?? {},
    );
  } else if (
    [
      "roadmap_generation",
      "roadmap_recalibration",
      "weekly_review",
      "monthly_breakdown",
      "daily_review",
    ].includes(req.feature)
  ) {
    systemPrompt = buildReviewSystemPrompt(
      req.periodType ?? req.feature,
      req.periodData ?? {},
    );
  } else if (req.feature === "intent_detection") {
    systemPrompt = INTENT_DETECTION_PROMPT;
  }

  return {
    provider: credentials.provider,
    credentials,
    systemPrompt,
    requiresIntentDetectionFirst,
    requiresUserPermission,
    backgroundJob: "backgroundJobsOnly" in modelConfig && !!modelConfig.backgroundJobsOnly,
  };
}

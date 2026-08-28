// supabase/functions/_shared/governance/constants.ts

export type ModelProviderId =
  | "MENTOR"
  | "ASSISTANT"
  | "GEMINI"
  | "DEEPSEEK"
  | "DEEPSEEK_VISION"
  | "DEEPGRAM_STT"
  | "DEEPGRAM_TTS"

export type FeatureRole =
  | "mentor_message"
  | "assistant_message"
  | "roadmap_assistant_message"
  | "journal_assistant_message"
  | "image_upload"
  | "document_upload"
  | "roadmap_generation"
  | "roadmap_recalibration"
  | "weekly_review"
  | "monthly_breakdown"
  | "daily_review"
  | "summarization"
  | "memory_tagging"
  | "journal_classification"
  | "intent_detection"
  | "chat_pattern_analysis"
  | "voice_output"
  | "voice_input"

// ─────────────────────────────────────────
// GOVERNANCE CONSTANTS
// Global rules, model routing, data access,
// assertiveness tiers, safety floors,
// feature capabilities, billing tiers
// ─────────────────────────────────────────

export const GOVERNANCE = {
  GLOBAL: {
    NO_EXTERNAL_DATA: true,
    NO_FABRICATION: true,
    FLAG_UNCERTAINTY: true,
    USER_DATA_ONLY: true,
  },

  // Model configuration — API keys loaded from Deno.env at runtime
  MODELS: {
    MENTOR: {
      provider: "MENTOR" as const,
      apiKeyVar: "MENTOR_API_KEY",
      baseUrlVar: "MENTOR_BASE_URL",
      modelVar: "MENTOR_MODEL",
      intendedBackend: "DeepSeek V4 Pro",
      roles: ["mentor_message"] as FeatureRole[],
      isUserFacing: true,
    },
    ASSISTANT: {
      provider: "ASSISTANT" as const,
      apiKeyVar: "ASSISTANT_API_KEY",
      baseUrlVar: "ASSISTANT_BASE_URL",
      modelVar: "ASSISTANT_MODEL",
      intendedBackend: "Gemini 2.5 Flash",
      roles: [
        "assistant_message",
        "roadmap_assistant_message",
        "journal_assistant_message",
      ] as FeatureRole[],
      isUserFacing: true,
    },
    GEMINI: {
      provider: "GEMINI" as const,
      apiKeyVar: "GEMINI_API_KEY",
      baseUrlVar: "GEMINI_BASE_URL",
      modelVar: "GEMINI_MODEL",
      intendedBackend: "Gemini 2.5 Flash",
      roles: [
        "roadmap_generation",
        "roadmap_recalibration",
        "weekly_review",
        "monthly_breakdown",
        "daily_review",
      ] as FeatureRole[],
      isUserFacing: true,
    },
    DEEPSEEK: {
      provider: "DEEPSEEK" as const,
      apiKeyVar: "DEEPSEEK_API_KEY",
      baseUrlVar: "DEEPSEEK_BASE_URL",
      modelVar: "DEEPSEEK_MODEL",
      intendedBackend: "DeepSeek V4 Flash",
      roles: [
        "summarization",
        "memory_tagging",
        "journal_classification",
        "intent_detection",
        "chat_pattern_analysis",
        "document_upload",
      ] as FeatureRole[],
      isUserFacing: false,
      backgroundJobsOnly: true,
    },
    DEEPSEEK_VISION: {
      provider: "DEEPSEEK_VISION" as const,
      apiKeyVar: "DEEPSEEK_VISION_API_KEY",
      baseUrlVar: "DEEPSEEK_VISION_BASE_URL",
      modelVar: "DEEPSEEK_VISION_MODEL",
      intendedBackend: "DeepSeek Vision",
      roles: ["image_upload"] as FeatureRole[],
      isUserFacing: true,
    },
    DEEPGRAM_STT: {
      provider: "DEEPGRAM_STT" as const,
      apiKeyVar: "DEEPGRAM_API_KEY",
      baseUrlVar: "DEEPGRAM_BASE_URL",
      modelVar: "DEEPGRAM_MODEL",
      intendedBackend: "Deepgram Nova-3 (STT)",
      roles: ["voice_input"] as FeatureRole[],
      scope: "mentor_sessions_only",
      audioPolicy: "discard_after_transcription",
      isUserFacing: true,
    },
    DEEPGRAM_TTS: {
      provider: "DEEPGRAM_TTS" as const,
      apiKeyVar: "DEEPGRAM_API_KEY_OUTPUT",
      baseUrlVar: "DEEPGRAM_BASE_URL",
      modelVar: "DEEPGRAM_MODEL_OUTPUT",
      intendedBackend: "Deepgram Aura-2-Asteria (TTS)",
      roles: ["voice_output"] as FeatureRole[],
      scope: "mentor_responses_only",
      isUserFacing: true,
    },
  },

  // Data access control by role
  DATA_ACCESS: {
    MENTOR: {
      memoryLiveWindow: true,
      memorySessionSummary: true,
      memoryPersistent: true,
      memoryEvents: true,
      memoryCachedAnalysis: true,
      memorySessionArchive: true,
      roadmap: true,
      roadmapPhases: true,
      tasks: true,
      userStreaks: true,
      userPerformance: true,
      journalEntries: "summary_only",
      userXp: false,
      xpTransactions: false,
      communityPosts: false,
      assertivenessLevel: true,
      canWriteRoadmap: true,
      requiresConfirmationBeforeWrite: true,
    },
    ASSISTANT: {
      memoryLiveWindow: false,
      memorySessionSummary: false,
      memoryPersistent: false,
      memoryEvents: false,
      memoryCachedAnalysis: false,
      memorySessionArchive: "with_permission_summary_only",
      roadmap: true,
      roadmapPhases: true,
      tasks: true,
      userStreaks: false,
      userPerformance: "with_permission",
      journalEntries: "with_permission_toggle_on_unlocked_only",
      userXp: false,
      xpTransactions: false,
      communityPosts: false,
      assertivenessLevel: false,
      canWriteRoadmap: false,
      shelf: true,
    },
    GEMINI_REVIEWS: {
      userPerformance: "current_period_only",
      tasks: "current_period_only",
      userStreaks: "current_period_only",
      memorySessionArchive: "current_period_only",
      roadmap: "phase_and_completion_only",
      journalEntries: false,
      memoryPersistent: false,
      userXp: false,
      canWriteRoadmap: false,
    },
    DEEPSEEK_BACKGROUND: {
      summarization: "overflow_messages_only",
      memory_tagging: "target_memory_record_only",
      journal_classification: "current_entry_only",
      intent_detection: "current_user_message_and_shelf_only",
      chat_pattern_analysis: "session_archives_current_period_only",
      canWriteRoadmap: false,
      canAccessMentor: false,
    },
    OPENAI_VOICE: {
      canAccessDatabase: false,
      audioRetention: "none",
    },
  },

  // Assertiveness levels and tone guidance
  ASSERTIVENESS: {
    1: {
      label: "Supportive",
      tone: "Lead with warmth. Acknowledge effort before addressing gaps. Frame weaknesses as growth opportunities. Never blunt.",
      ideaEval:
        "That is genuinely interesting because of [strengths]. Areas worth thinking through: [weaknesses]. Addressing those will strengthen this significantly.",
    },
    2: {
      label: "Balanced Gentle",
      tone: "Acknowledge strengths clearly. Surface weaknesses directly but with context. Constructive framing throughout.",
      ideaEval:
        "Real potential here — [strengths]. That said, [weaknesses] are gaps needing work before this advances.",
    },
    3: {
      label: "Balanced",
      tone: "Equal weight strengths and weaknesses. Direct without harsh. No excessive softening.",
      ideaEval:
        "Strengths: [strengths]. Vulnerabilities: [weaknesses]. Address those, this becomes viable.",
    },
    4: {
      label: "Direct",
      tone: "Lead with most important point. Minimal softening. Honest about severity of weaknesses.",
      ideaEval:
        "Works because of [strengths]. But [weaknesses] are real problems — especially [biggest]. Fix first.",
    },
    5: {
      label: "Blunt",
      tone: "No preamble. State plainly. Weaknesses named clearly. No padding.",
      ideaEval:
        "[Strengths] give foundation. [Weaknesses] — especially [biggest] — are blind spots that kill most ideas before beta. Address seriously.",
    },
  },

  // Immutable safety rules
  SAFETY_FLOORS: {
    NO_SHAMING:
      "Never attack character, intelligence, or worth. Challenge ideas only.",
    NO_MOCKERY:
      "Never use sarcasm, condescension, or dismissal about thinking.",
    NO_FABRICATION:
      "Never generate information not present in provided data.",
    NO_HOPELESSNESS:
      "Never leave without forward path. Every critique ends with direction.",
    DIGNITY_ALWAYS:
      "Regardless of assertiveness, user's dignity is non-negotiable.",
  },

  // Roadmap modification protocol
  ROADMAP_MODIFICATION: {
    triggerConditions: [
      "user_explicitly_requests_change",
      "mentor_identifies_misalignment_from_data",
    ],
    allowedDataSources: [
      "current_roadmap_state",
      "user_progress_data",
      "conversation_history",
    ],
    prohibitedDataSources: [
      "general_knowledge",
      "assumptions",
      "external_benchmarks",
    ],
    confirmationFlow: [
      "mentor_explains_reasoning",
      "mentor_presents_proposed_change",
      "user_confirms",
      "write_to_database",
    ],
    requiresUserConfirmation: true,
  },

  // Assistant shelf rules
  ASSISTANT_SHELF: {
    scope: "session_only",
    clearsOn: "session_wrap_up",
    populatedBy: "explicit_user_permission_only",
    preLoadedScreens: {
      roadmapScreen: [
        "roadmap",
        "currentPhase",
        "activeTasks",
      ],
      journalScreen: [],
      mentorScreen: [],
    },
    journalAccessRule:
      "assistant_access_toggle_on_unlocked_entries_only",
    lockedJournalRule: "no_access_under_any_condition",
    mentorHistoryRule: "summary_only_with_explicit_session_permission",
  },

  // Voice I/O configuration
  VOICE: {
    inputModel: "OPENAI_WHISPER",
    outputModel: "OPENAI_TTS",
    inputScope: "mentor_sessions_only",
    outputScope: "mentor_text_responses_only",
    audioRetention: "none",
    transcriptionFlow: "audio_in → whisper → text → mentor_pipeline",
    outputFlow: "mentor_text_response → tts → audio_out",
  },

  // Performance review configuration
  PERFORMANCE_BREAKDOWN: {
    metricOrder: [
      "tasks_accomplished_named",
      "tasks_missed",
      "streak_status",
      "key_growth_areas_from_chat_patterns",
      "roadmap_phase_progress",
    ],
    dataSource: "user_generated_only",
    externalDataProhibited: true,
    badWeekRedirect:
      "Talk to your mentor, adjust approach, don't let it compound.",
    growthAreaSource: "deepseek_v4_flash_chat_pattern_analysis",
  },
} as const

// Feature → provider resolver
export function resolveProviderForFeature(
  feature: FeatureRole
): ModelProviderId | null {
  for (const [providerId, config] of Object.entries(GOVERNANCE.MODELS)) {
    if ("roles" in config && (config.roles as FeatureRole[]).includes(feature)) {
      return providerId as ModelProviderId
    }
  }
  return null
}

// Billing tier output capabilities
export const BILLING_TIERS = {
  free: {
    name: "Free",
    monthlyTokenBudget: 50000,
    allowedFeatures: [
      "mentor_message",
      "assistant_message",
      "summarization",
      "intent_detection",
      "journal_classification",
    ] as FeatureRole[],
    voiceSupport: false,
    mentorSupport: true,
  },
  builder: {
    name: "Builder",
    monthlyTokenBudget: 150000,
    allowedFeatures: [
      "mentor_message",
      "assistant_message",
      "roadmap_assistant_message",
      "journal_assistant_message",
      "summarization",
      "memory_tagging",
      "intent_detection",
      "journal_classification",
      "daily_review",
      "voice_input",
      "voice_output",
      "document_upload",
    ] as FeatureRole[],
    voiceSupport: true,
    mentorSupport: true,
  },
  operator: {
    name: "Operator",
    monthlyTokenBudget: 400000,
    allowedFeatures: [
      "mentor_message",
      "assistant_message",
      "roadmap_assistant_message",
      "journal_assistant_message",
      "image_upload",
      "roadmap_generation",
      "roadmap_recalibration",
      "weekly_review",
      "monthly_breakdown",
      "daily_review",
      "summarization",
      "memory_tagging",
      "journal_classification",
      "intent_detection",
      "chat_pattern_analysis",
      "voice_input",
      "voice_output",
      "document_upload",
    ] as FeatureRole[],
    voiceSupport: true,
    mentorSupport: true,
  },
  founder: {
    name: "Founder",
    monthlyTokenBudget: 1000000,
    allowedFeatures: [
      "mentor_message",
      "assistant_message",
      "roadmap_assistant_message",
      "journal_assistant_message",
      "image_upload",
      "roadmap_generation",
      "roadmap_recalibration",
      "weekly_review",
      "monthly_breakdown",
      "daily_review",
      "summarization",
      "memory_tagging",
      "journal_classification",
      "intent_detection",
      "chat_pattern_analysis",
      "voice_input",
      "voice_output",
      "document_upload",
    ] as FeatureRole[],
    voiceSupport: true,
    mentorSupport: true,
  },
} as const

// Check if tier allows feature
export function tierAllowsFeature(
  tier: keyof typeof BILLING_TIERS,
  feature: FeatureRole
): boolean {
  return BILLING_TIERS[tier]?.allowedFeatures.includes(feature) ?? false
}

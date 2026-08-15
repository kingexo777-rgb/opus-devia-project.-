// supabase/functions/roadmap-generator/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type Archetype = "Closer" | "Creator" | "Strategist" | "Operator" | "Maverick"
type TaskDifficulty = "small" | "medium" | "large"
type TaskType = "deep" | "shallow"

// ─────────────────────────────────────────
// DIFFICULTY SCORE 1–5
// Computed from task attributes so every
// task has a meaningful 1–5 rating.
// ─────────────────────────────────────────
function computeDifficultyScore(
  difficulty: TaskDifficulty,
  taskType: TaskType,
  isMajor: boolean
): number {
  // Base score from difficulty label
  let score = difficulty === "small" ? 1 : difficulty === "medium" ? 3 : 4
  // Deep tasks are +1 harder
  if (taskType === "deep") score += 1
  // Major milestone tasks are +1 harder
  if (isMajor) score += 1
  // Clamp 1–5
  return Math.min(5, Math.max(1, score))
}

// Unique padding tasks so phases 2-3 never
// get the same title repeated
const PHASE2_PADDING_TASKS: Array<{ title: string; desc: string }> = [
  { title: "Define your ideal customer profile", desc: "Write down exactly who pays, why they pay, and what triggers the purchase decision." },
  { title: "Run your first outreach experiment", desc: "Reach out to 5-10 potential customers with a clear ask. Measure response rate." },
  { title: "Collect and document feedback systematically", desc: "Every conversation is data. Log objections, questions, and patterns." },
  { title: "Refine your value proposition based on real feedback", desc: "Adjust your positioning and pitch based on what you heard from real people." },
  { title: "Secure one committed test user or early adopter", desc: "One person who is willing to try your product and give honest feedback." },
]

const PHASE3_PADDING_TASKS: Array<{ title: string; desc: string }> = [
  { title: "Document your current acquisition channel", desc: "Where are customers coming from? Measure cost per acquisition and conversion rate." },
  { title: "Identify one scalable growth lever", desc: "Content, referrals, ads, partnerships — find the one channel that can 10×." },
  { title: "Automate one manual process", desc: "Find the most time-consuming repeatable task and build or buy a solution for it." },
  { title: "Build a retention or reactivation system", desc: "Set up an automated email or notification sequence to bring users back." },
  { title: "Hire or outsource one non-core task", desc: "Free your time for high-leverage work. Delegate anything that is not your unique strength." },
]

interface QuestionnaireAnswers {
  q1: string // who you are
  q2: string // how you think and decide
  q3: string // energy and discipline
  q4: string // psychology
  q5: string // ambition
  q6: string // blockers
}

interface ExtractedScores {
  skill_alignment: number
  infrastructure_fit: number
  time_energy: number
  risk_motivation: number
  failure_penalty: number
  enjoyment_alignment: number
  discipline_level: number
  ambition_level: number
}

interface GoalMetrics {
  weekly_hours: number
  deadline_months: number
  risk_tolerance: number
}

interface PathScore {
  name: string
  score: number
  compatibility_rating: number
  best_for_archetypes: Archetype[]
  reason: string
}

interface ArchetypeCase {
  strengths: string
  weaknesses: string
  advantages: string
  blind_spots: string
  case: string
}

interface TaskTemplate {
  title: string
  description: string
  goal_description: string
  difficulty_rationale: string
  task_type: TaskType
  difficulty: TaskDifficulty
  difficulty_score: number
  is_major: boolean
  xp_reward: number
  estimated_hours: number
  order_index: number
}

interface PhaseTemplate {
  phase_number: number
  title: string
  description: string
  unlock_condition: "auto" | "mentor_override"
  tasks: TaskTemplate[]
}

interface AIComputedProfile {
  extracted_scores: ExtractedScores
  goal_metrics: GoalMetrics
  archetype_scores: Record<Archetype, number>
  primary_archetype: Archetype
  secondary_archetype: Archetype
  path_scores: PathScore[]
  archetype_cases: Record<Archetype, ArchetypeCase>
  psychology_profile: {
    loves: string[]
    hates: string[]
    discipline_triggers: string[]
    known_disruptors: string[]
    bad_habits: string[]
    limiting_beliefs: string[]
    admired_business_approach: string
    decision_style: string
    motivation_depth: string
  }
  roadmap_input: {
    base_effort_hours: number
    adjusted_deadline_months: number
    major_tasks_suggestion: string[]
    recommended_path: string
  }
}

// ─────────────────────────────────────────
// SYSTEM PROMPT FOR ROADMAP AI
// Uses Gemini 2.5 Flash via GEMINI env vars
// Data constraint enforced — user answers only
// No fabrication, no external benchmarks
// ─────────────────────────────────────────
function buildRoadmapSystemPrompt(): string {
  return [
    "You are RoadmapAI, the strategic planning engine inside Opus Devia.",
    "Your job is to convert a user's actual situation into a realistic progression plan.",
    "You are NOT a motivational coach, personality quiz, or generic business-advice generator.",
    "",
    "CORE PRINCIPLE:",
    "The user profile is evidence. The roadmap framework is the constraint. Your reasoning chooses the best sequence inside that constraint.",
    "Never invent user facts. Never assume money, skills, audience, equipment, network, education, experience, location, or access unless explicitly provided.",
    "When evidence is missing, do not fill the gap with a plausible assumption. Make the dependency something the user must discover or validate.",
    "",
    "PERSONALISATION STANDARD:",
    "Every phase and task must exist because of something specific about the user's goal, current state, resources, constraints, strengths, weaknesses, psychology, or chosen path.",
    "A task that could be given unchanged to almost any beginner is a weak task. Replace it with a conditional, evidence-driven task.",
    "Do not personalize by merely mentioning the user's archetype. Personalize the actual action, difficulty, sequence, scope, and success condition.",
    "",
    "ROADMAP LOGIC:",
    "Build a dependency-aware progression, not a checklist.",
    "Phase 1 must remove the highest-risk uncertainty or capability bottleneck preventing sensible progress.",
    "Phase 2 must create real-world evidence: conversations, tests, prototypes, offers, outputs, users, sales, or another observable signal appropriate to the path.",
    "Phase 3 must convert the strongest validated signal into a repeatable next stage of progress.",
    "Do not force generic scaling work if the user has not validated the underlying opportunity.",
    "Do not assign advanced work before its prerequisites are satisfied.",
    "Prefer the shortest credible route to a meaningful real-world result.",
    "",
    "TASK DESIGN:",
    "Each task must have one concrete outcome and a visible completion condition.",
    "Tasks should produce evidence or capability that directly unlocks a later task.",
    "Prefer actions the user can actually perform over passive research or vague learning.",
    "If research is necessary, specify exactly what must be learned and what decision the research will inform.",
    "If a task depends on unknown information, make that discovery the task instead of assuming the answer.",
    "Do not fabricate customers, markets, prices, conversion rates, regulations, competitors, tools, or benchmarks.",
    "",
    "FEASIBILITY:",
    "Respect the user's stated weekly hours, deadline, capital, skill level, and constraints.",
    "Do not create a roadmap that requires more time than the user can realistically supply.",
    "Prefer small executable steps early and increase difficulty only when evidence supports it.",
    "Estimated hours must represent the user's actual workload, not an idealized founder's workload.",
    "",
    "VALIDATION-FIRST RULE:",
    "Never ask a user to build a large asset before the relevant demand, problem, audience, or feasibility assumption has been tested when testing is possible.",
    "When a path can be tested cheaply before it is built, test first.",
    "A successful roadmap should reduce uncertainty as it progresses, not merely accumulate completed tasks.",
    "",
    "PROFILE EXTRACTION RULES:",
    "Separate what the user explicitly said from what you infer.",
    "Use scores as signals, not facts. A score cannot create a fact that the questionnaire did not contain.",
    "Keep archetypes descriptive rather than deterministic. Never let an archetype override explicit constraints or goals.",
    "Archetypes: Closer = selling/people/revenue oriented; Creator = making/content/product oriented; Strategist = planning/data/long-term oriented; Operator = systems/process/execution oriented; Maverick = contrarian/high-autonomy/cross-domain oriented.",
    "Score archetypes from evidence in the answers, not stereotypes. A user can have a mixed profile.",
    "Path compatibility is a recommendation signal, not a prediction. Consider skills, infrastructure, time/energy, risk/motivation, enjoyment, discipline, failure tolerance, and ambition.",
    "When computing compatibility, do not let a high score override a hard constraint explicitly stated by the user.",
    "The profile must preserve the user's real constraints in goal_metrics and roadmap_input.",
    "",
    "PROFILE OUTPUT SCHEMA:",
    '{ "extracted_scores": { "skill_alignment": 0, "infrastructure_fit": 0, "time_energy": 0, "risk_motivation": 0, "failure_penalty": 0, "enjoyment_alignment": 0, "discipline_level": 0, "ambition_level": 0 }, "goal_metrics": { "weekly_hours": 0, "deadline_months": 0, "risk_tolerance": 0 }, "archetype_scores": { "Closer": 0, "Creator": 0, "Strategist": 0, "Operator": 0, "Maverick": 0 }, "primary_archetype": "", "secondary_archetype": "", "path_scores": [ { "name": "", "score": 0, "compatibility_rating": 0, "best_for_archetypes": [], "reason": "" } ], "archetype_cases": { "Closer": { "strengths": "", "weaknesses": "", "advantages": "", "blind_spots": "", "case": "" }, "Creator": { "strengths": "", "weaknesses": "", "advantages": "", "blind_spots": "", "case": "" }, "Strategist": { "strengths": "", "weaknesses": "", "advantages": "", "blind_spots": "", "case": "" }, "Operator": { "strengths": "", "weaknesses": "", "advantages": "", "blind_spots": "", "case": "" }, "Maverick": { "strengths": "", "weaknesses": "", "advantages": "", "blind_spots": "", "case": "" } }, "psychology_profile": { "loves": [], "hates": [], "discipline_triggers": [], "known_disruptors": [], "bad_habits": [], "limiting_beliefs": [], "admired_business_approach": "", "decision_style": "", "motivation_depth": "" }, "roadmap_input": { "base_effort_hours": 0, "adjusted_deadline_months": 0, "major_tasks_suggestion": [], "recommended_path": "" } }',
    "",
    "OUTPUT:",
    "Return ONLY valid JSON matching the requested structure.",
    "No markdown. No explanation outside JSON.",
  ].join("\n")
}

async function generatePhaseTemplates(
  archetype: Archetype,
  path: string,
  majorTasksHint: string[],
  profile?: AIComputedProfile,
  answers?: QuestionnaireAnswers,
): Promise<PhaseTemplate[]> {
  // The old implementation selected a static archetype/path template and only
  // personalized its explanations afterwards. That made the roadmap itself
  // largely identical for users with the same path. The engine now asks the
  // model to construct the roadmap from the structured profile while keeping
  // the output contract deterministic and validating the result before use.
  if (!profile || !answers) {
    return generateFallbackPhases(archetype, path, majorTasksHint)
  }

  const systemPrompt = [
    buildRoadmapSystemPrompt(),
    "",
    "You are now generating the actual Opus Devia roadmap.",
    "Use the supplied profile and answers as the complete evidence set.",
    "The roadmap must contain exactly 3 phases and exactly 5 tasks per phase because the application expects that structure.",
    "",
    "PHASE CONTRACT:",
    "Phase 1 = remove the most important current bottleneck and establish the minimum foundation required for a real test.",
    "Phase 2 = run the most informative real-world validation or execution loop available to this path.",
    "Phase 3 = exploit the strongest validated signal and establish the next repeatable operating system.",
    "These are intents, not templates. The actual content must be derived from this user.",
    "",
    "TASK CONTRACT:",
    "Every task must be concrete, sequential, feasible, and materially useful.",
    "Do not create filler tasks merely to reach five tasks.",
    "Do not repeat the same action with different wording.",
    "Do not use generic tasks such as 'learn about marketing', 'build a brand', 'research competitors', or 'create a business plan' unless the user's specific situation makes that exact action necessary; if used, define the exact decision/output it must produce.",
    "At least 8 of the 15 tasks should produce external evidence or a tangible artifact.",
    "At least 3 tasks should explicitly test an assumption that could cause the path to fail.",
    "Each task should prepare the next task.",
    "",
    "SUCCESS CONDITIONS:",
    "description must say what the user actually does.",
    "goal_description must explain why this exact task is necessary for this exact user's current position.",
    "difficulty must be small, medium, or large.",
    "task_type must be deep or shallow.",
    "is_major should be true only for consequential milestones.",
    "estimated_hours must be realistic and sum to no more than roughly 80% of the user's available hours over the stated deadline; leave capacity for unexpected work.",
    "xp_reward should reflect difficulty and consequence, not task length alone.",
    "",
    "HALLUCINATION CONTROL:",
    "Never state an unsupported fact as if it were true.",
    "If the roadmap needs information the user did not provide, create a discovery/validation task that obtains that information.",
    "Do not invent named customers, target demographics, revenue figures, market sizes, prices, conversion rates, competitors, credentials, or resources.",
    "Do not cite external statistics or benchmarks.",
    "",
    'OUTPUT SCHEMA: { "phases": [ { "phase_number": 1, "title": "", "description": "", "unlock_condition": "auto", "tasks": [ { "title": "", "description": "", "goal_description": "", "task_type": "deep", "difficulty": "small", "is_major": false, "xp_reward": 0, "estimated_hours": 0, "order_index": 1 } ] } ] }',
    "Return only JSON.",
  ].join("\n")

  const primaryCase = profile.archetype_cases[profile.primary_archetype]
  const userInput = [
    "USER EVIDENCE — DO NOT INVENT BEYOND THIS:",
    JSON.stringify({
      questionnaire_answers: answers,
      primary_archetype: profile.primary_archetype,
      secondary_archetype: profile.secondary_archetype,
      extracted_scores: profile.extracted_scores,
      goal_metrics: profile.goal_metrics,
      path_scores: profile.path_scores,
      psychology_profile: profile.psychology_profile,
      roadmap_input: profile.roadmap_input,
      primary_archetype_case: primaryCase,
      selected_path: path,
      major_task_hints: majorTasksHint,
    }, null, 2),
    "",
    "Before writing the roadmap, reason internally through:",
    "1. What is the user's actual desired outcome?",
    "2. What is their current starting position?",
    "3. What is the single largest constraint or failure risk?",
    "4. What must be proven before significant effort is invested?",
    "5. What sequence gives this user the highest information and progress per hour?",
    "6. What should the user deliberately NOT do yet?",
    "Do not output this reasoning; encode the conclusions in the roadmap.",
  ].join("\n")

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY")!
    const model = Deno.env.get("GEMINI_MODEL")!
    const rawBaseUrl = Deno.env.get("GEMINI_BASE_URL")!
    const isOpenRouter = apiKey.startsWith("sk-or-")
    const baseUrl = isOpenRouter
      ? "https://openrouter.ai/api/v1"
      : rawBaseUrl.replace(/^http:\/\//, "https://")

    let raw = ""
    if (isOpenRouter) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
          ],
          max_tokens: 6000,
          temperature: 0.2,
        }),
      })
      const data = await response.json()
      raw = data.choices?.[0]?.message?.content ?? ""
    } else {
      const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userInput}` }] }],
          generationConfig: {
            maxOutputTokens: 6000,
            temperature: 0.2,
          },
        }),
      })
      const data = await response.json()
      raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    }

    const clean = raw.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean) as { phases?: PhaseTemplate[] }
    const validated = validateGeneratedRoadmap(parsed.phases ?? [], profile)

    if (validated.length === 3 && validated.every((p) => p.tasks.length === 5)) {
      return validated
    }

    console.warn("Generated roadmap failed structural validation; using deterministic fallback.")
    return generateFallbackPhases(archetype, path, majorTasksHint)
  } catch (ex) {
    console.error("Personalized roadmap generation failed:", ex)
    return generateFallbackPhases(archetype, path, majorTasksHint)
  }
} 

function validateGeneratedRoadmap(
  phases: PhaseTemplate[],
  profile: AIComputedProfile,
): PhaseTemplate[] {
  const weeklyHours = Math.max(1, Number(profile.goal_metrics.weekly_hours) || 1)
  const deadlineMonths = Math.max(1, Number(profile.goal_metrics.deadline_months) || 1)
  const totalCapacity = weeklyHours * 4.345 * deadlineMonths * 0.8
  const safePhases = Array.isArray(phases) ? phases.slice(0, 3) : []
  const seenTitles = new Set<string>()
  let totalHours = 0

  for (let pi = 0; pi < safePhases.length; pi++) {
    const phase = safePhases[pi]
    phase.phase_number = pi + 1
    phase.unlock_condition = "auto"
    phase.title = String(phase.title || `Phase ${pi + 1}`).trim().slice(0, 120)
    phase.description = String(phase.description || "").trim().slice(0, 500)

    if (!Array.isArray(phase.tasks)) phase.tasks = []
    phase.tasks = phase.tasks.slice(0, 5)

    while (phase.tasks.length < 5) {
      phase.tasks.push({
        title: `Complete the next ${pi === 0 ? "foundation" : pi === 1 ? "validation" : "execution"} step`,
        description: "Use the current evidence and constraints to define and complete the smallest necessary next step.",
        goal_description: "This closes the next gap required by the current phase without assuming facts that have not been established.",
        difficulty_rationale: "Fallback task used because the generated roadmap did not provide enough valid tasks.",
        task_type: "shallow",
        difficulty: "small",
        difficulty_score: 1,
        is_major: false,
        xp_reward: 15,
        estimated_hours: 1,
        order_index: phase.tasks.length + 1,
      })
    }

    phase.tasks = phase.tasks.map((task, ti) => {
      let title = String(task.title || "Next actionable step").trim().slice(0, 140)
      const titleKey = title.toLowerCase()
      if (seenTitles.has(titleKey)) title = `${title} — iteration ${ti + 1}`
      seenTitles.add(title.toLowerCase())

      const difficulty: TaskDifficulty = task.difficulty === "large" || task.difficulty === "medium" ? task.difficulty : "small"
      const taskType: TaskType = task.task_type === "deep" ? "deep" : "shallow"
      const isMajor = Boolean(task.is_major)
      const difficultyScore = computeDifficultyScore(difficulty, taskType, isMajor)
      const estimatedHours = Math.max(0.5, Math.min(40, Number(task.estimated_hours) || 1))
      const xpReward = Math.max(10, Math.min(250, Number(task.xp_reward) || difficultyScore * 15))

      totalHours += estimatedHours
      return {
        title,
        description: String(task.description || "Complete this task and record the observable result.").trim().slice(0, 800),
        goal_description: String(task.goal_description || "This task advances the current milestone for this user's roadmap.").trim().slice(0, 600),
        difficulty_rationale: String(task.difficulty_rationale || `Difficulty is calibrated at ${difficultyScore}/5 based on scope and consequence.`).trim().slice(0, 500),
        task_type: taskType,
        difficulty,
        difficulty_score: difficultyScore,
        is_major: isMajor,
        xp_reward: xpReward,
        estimated_hours: estimatedHours,
        order_index: ti + 1,
      }
    })
  }

  // Never let a generated roadmap silently consume more time than the user
  // plausibly has. Scale estimated hours rather than changing the task set.
  if (totalHours > totalCapacity && totalCapacity > 0) {
    const scale = Math.max(0.35, totalCapacity / totalHours)
    for (const phase of safePhases) {
      for (const task of phase.tasks) {
        task.estimated_hours = Math.max(0.5, Math.round(task.estimated_hours * scale * 2) / 2)
      }
    }
  }

  return safePhases
}

function generateFallbackPhases(
  archetype: Archetype,
  path: string,
  majorTasksHint: string[]
): PhaseTemplate[] {
  // Emergency-only fallback. The normal path is AI-constructed and validated.
  const phaseNames = [
    { title: `Phase 1: Establish the ${path} Foundation`, description: `Remove the most important current constraint and prepare a testable first step for ${path}.` },
    { title: `Phase 2: Validate ${path} in the Real World`, description: "Obtain observable evidence before committing significant additional effort." },
    { title: `Phase 3: Build the Next Repeatable System`, description: "Use the strongest evidence obtained so far to create the next repeatable progression step." },
  ]
  const attrs: Array<Omit<TaskTemplate, "title" | "description" | "order_index" | "difficulty_score" | "goal_description" | "difficulty_rationale">> = [
    { task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 50, estimated_hours: 3 },
    { task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1 },
    { task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 35, estimated_hours: 2 },
    { task_type: "deep", difficulty: "small", is_major: false, xp_reward: 25, estimated_hours: 1.5 },
    { task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 60, estimated_hours: 3 },
  ]
  return phaseNames.map((phase, pi) => ({
    phase_number: pi + 1,
    title: phase.title,
    description: phase.description,
    unlock_condition: "auto" as const,
    tasks: attrs.map((a, i) => {
      const hint = majorTasksHint[pi * 5 + i]
      const title = hint?.trim() || `Define and complete the next ${pi === 0 ? "foundation" : pi === 1 ? "validation" : "execution"} step`
      const score = computeDifficultyScore(a.difficulty, a.task_type, a.is_major)
      return {
        ...a,
        title,
        description: "Complete this step using only information that has been established about your current situation, and record the result.",
        goal_description: `Emergency fallback for the ${path} path. This step should be replaced by the personalized generation path when the model is available.`,
        difficulty_rationale: `Fallback difficulty: ${score}/5 based on task scope and consequence.`,
        difficulty_score: score,
        order_index: i + 1,
      }
    }),
  }))
}

function enrichDifficultyScores(phases: PhaseTemplate[]): PhaseTemplate[] {
  return phases.map((phase) => ({
    ...phase,
    tasks: phase.tasks.map((task) => ({
      ...task,
      // Always recompute — never trust pre-existing value
      difficulty_score: computeDifficultyScore(task.difficulty, task.task_type, task.is_major),
      goal_description: "",
      difficulty_rationale: "",
    })),
  }))
}

// ─────────────────────────────────────────
// AI GENERATION: Per-task goal descriptions
// and difficulty rationales.
// Batched per phase (5 tasks each) to stay
// within token limits. Falls back to
// phase unchanged on failure.
// ─────────────────────────────────────────
async function generateTaskGoalsAndRationales(
  phases: PhaseTemplate[],
  profile: AIComputedProfile,
  answers: QuestionnaireAnswers,
  path: string
): Promise<PhaseTemplate[]> {
  const enrichedPhases: PhaseTemplate[] = []

  for (const phase of phases) {
    const taskList = phase.tasks.map((t, ti) => ({
      task_index: ti,
      phase_number: phase.phase_number,
      phase_title: phase.title,
      title: t.title,
      description: t.description,
      difficulty_score: t.difficulty_score,
      difficulty_label: t.difficulty,
      task_type: t.task_type,
      is_major: t.is_major,
      xp_reward: t.xp_reward,
      estimated_hours: t.estimated_hours,
    }))

    const systemPrompt = [
      "You are the final quality-control and personalization layer inside Opus Devia.",
      "You are NOT allowed to invent user facts or change the roadmap's underlying task sequence.",
      "For each supplied task, write a concise goal_description explaining why that exact action matters for this exact user.",
      "Use the questionnaire evidence and computed profile. Do not merely repeat the archetype label.",
      "If the data does not justify a personal claim, describe the task's dependency and expected evidence instead.",
      "Write a difficulty_rationale that agrees exactly with the supplied difficulty_score.",
      "Do not claim statistics, market facts, customer behaviour, prices, or outcomes that were not supplied.",
      `There are exactly ${phase.tasks.length} tasks. Return exactly ${phase.tasks.length} results.`,
      "Return ONLY valid JSON.",
      '{ "tasks": [ { "task_index": 0, "goal_description": "", "difficulty_rationale": "" } ] }',
    ].join("\n")

    const userInput = [
      "USER ANSWERS:",
      JSON.stringify(answers, null, 2),
      "",
      "COMPUTED PROFILE:",
      JSON.stringify({
        primary_archetype: profile.primary_archetype,
        secondary_archetype: profile.secondary_archetype,
        extracted_scores: profile.extracted_scores,
        goal_metrics: profile.goal_metrics,
        psychology_profile: profile.psychology_profile,
        roadmap_input: profile.roadmap_input,
        primary_archetype_case: profile.archetype_cases[profile.primary_archetype],
      }, null, 2),
      "",
      `PATH: ${path}`,
      `PHASE: ${phase.title}`,
      "TASKS:",
      JSON.stringify(taskList, null, 2),
    ].join("\n")

    try {
      const apiKey = Deno.env.get("GEMINI_API_KEY")!
      const model = Deno.env.get("GEMINI_MODEL")!
      const rawBaseUrl = Deno.env.get("GEMINI_BASE_URL")!
      const isOpenRouter = apiKey.startsWith("sk-or-")
      const baseUrl = isOpenRouter
        ? "https://openrouter.ai/api/v1"
        : rawBaseUrl.replace(/^http:\/\//, "https://")

      let raw = ""
      if (isOpenRouter) {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userInput },
            ],
            max_tokens: 2000,
            temperature: 0.15,
          }),
        })
        const data = await response.json()
        raw = data.choices?.[0]?.message?.content ?? ""
      } else {
        const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userInput}` }] }],
            generationConfig: { maxOutputTokens: 2000, temperature: 0.15 },
          }),
        })
        const data = await response.json()
        raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
      }

      const clean = raw.replace(/```json|```/g, "").trim()
      const result = JSON.parse(clean) as {
        tasks: Array<{ task_index: number; goal_description: string; difficulty_rationale: string }>
      }
      const enrichedMap = new Map(result.tasks.map((t) => [t.task_index, t]))

      enrichedPhases.push({
        ...phase,
        tasks: phase.tasks.map((task, ti) => {
          const enriched = enrichedMap.get(ti)
          return {
            ...task,
            goal_description: enriched?.goal_description?.trim() || task.goal_description || "",
            difficulty_rationale: enriched?.difficulty_rationale?.trim() || task.difficulty_rationale || `Final difficulty score: ${task.difficulty_score}/5.`,
          }
        }),
      })
    } catch (ex) {
      console.error(`Phase ${phase.phase_number} enrichment failed:`, ex)
      enrichedPhases.push(phase)
    }
  }

  return enrichedPhases
}
// ─────────────────────────────────────────
// CALL GEMINI 2.5 FLASH
// Uses GEMINI environment variables
// ─────────────────────────────────────────
async function callGeminiForProfile(
  answers: QuestionnaireAnswers,
  maxTokens: number
): Promise<AIComputedProfile> {
  const systemPrompt = buildRoadmapSystemPrompt()
  const userInput = [
    "Analyze these onboarding answers and return the computed profile JSON.",
    "",
    `Q1 — Who you are: ${answers.q1}`,
    `Q2 — How you think and decide: ${answers.q2}`,
    `Q3 — Energy and discipline: ${answers.q3}`,
    `Q4 — Psychology: ${answers.q4}`,
    `Q5 — Ambition: ${answers.q5}`,
    `Q6 — Blockers: ${answers.q6}`,
  ].join("\n")

  const apiKey = Deno.env.get("GEMINI_API_KEY")!
  const model = Deno.env.get("GEMINI_MODEL")!
  const rawBaseUrl = Deno.env.get("GEMINI_BASE_URL")!
  const isOpenRouter = apiKey.startsWith("sk-or-")
  const baseUrl = isOpenRouter
    ? "https://openrouter.ai/api/v1"
    : rawBaseUrl.replace(/^http:\/\//, "https://")

  // Timeout wrapper — prevents hanging forever if the upstream
  // provider stalls instead of returning an error. 25s leaves
  // headroom inside Supabase Edge Function's execution limit.
  async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      return res
    } finally {
      clearTimeout(timeoutId)
    }
  }

  if (isOpenRouter) {
    let response: Response
    try {
      response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
          ],
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
      })
    } catch (err) {
      const reason = err instanceof Error && err.name === "AbortError" ? "timed out after 25s" : String(err)
      throw new Error(`Gemini request failed to reach OpenRouter: ${reason}`)
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      throw new Error(`OpenRouter returned ${response.status}: ${errBody.slice(0, 500)}`)
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content ?? ""
    if (!raw) {
      throw new Error(`OpenRouter returned no content. Full response: ${JSON.stringify(data).slice(0, 500)}`)
    }

    try {
      return JSON.parse(raw.replace(/```json|```/g, "").trim()) as AIComputedProfile
    } catch {
      const retryResponse = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput + "\n\nReturn ONLY valid JSON. No markdown, no explanation." },
          ],
          max_tokens: maxTokens,
          temperature: 0.1,
        }),
      })
      if (!retryResponse.ok) {
        const errBody = await retryResponse.text().catch(() => "")
        throw new Error(`OpenRouter retry returned ${retryResponse.status}: ${errBody.slice(0, 500)}`)
      }
      const retryData = await retryResponse.json()
      const retryRaw = retryData.choices?.[0]?.message?.content ?? ""
      if (!retryRaw) {
        throw new Error(`OpenRouter retry returned no content: ${JSON.stringify(retryData).slice(0, 500)}`)
      }
      return JSON.parse(retryRaw.replace(/```json|```/g, "").trim()) as AIComputedProfile
    }
  }

  const fullPrompt = `${systemPrompt}\n\n${userInput}`
  let response: Response
  try {
    response = await fetchWithTimeout(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
      }),
    })
  } catch (err) {
    const reason = err instanceof Error && err.name === "AbortError" ? "timed out after 25s" : String(err)
    throw new Error(`Gemini request failed to reach Google: ${reason}`)
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "")
    throw new Error(`Gemini returned ${response.status}: ${errBody.slice(0, 500)}`)
  }

  const data = await response.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  if (!raw) {
    throw new Error(`Gemini returned no content. Full response: ${JSON.stringify(data).slice(0, 500)}`)
  }

  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as AIComputedProfile
  } catch {
    const retryResponse = await fetchWithTimeout(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${fullPrompt}\n\nReturn ONLY valid JSON. No markdown, no explanation.` }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 },
      }),
    })
    if (!retryResponse.ok) {
      const errBody = await retryResponse.text().catch(() => "")
      throw new Error(`Gemini retry returned ${retryResponse.status}: ${errBody.slice(0, 500)}`)
    }
    const retryData = await retryResponse.json()
    const retryRaw = retryData.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    if (!retryRaw) {
      throw new Error(`Gemini retry returned no content: ${JSON.stringify(retryData).slice(0, 500)}`)
    }
    return JSON.parse(retryRaw.replace(/```json|```/g, "").trim()) as AIComputedProfile
  }
}

// ─────────────────────────────────────────
// CHECK 85% COMPLETION FOR EARLY UNLOCK
// Pure math — no AI call needed
// ─────────────────────────────────────────
async function checkEarlyUnlockEligibility(
  roadmapId: string
): Promise<{ eligible: boolean; percentage: number }> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("is_completed")
    .eq("roadmap_id", roadmapId)

  if (!tasks || tasks.length === 0) return { eligible: false, percentage: 0 }

  const total = tasks.length
  const completed = tasks.filter((t: any) => t.is_completed).length
  const percentage = Math.round((completed / total) * 100)

  return { eligible: percentage >= 85, percentage }
}

// ─────────────────────────────────────────
// AUTO UNLOCK NEXT PHASE
// Fires after every task completion
// ─────────────────────────────────────────
async function checkAndAutoUnlockPhase(roadmapId: string): Promise<void> {
  const { data: phases } = await supabase
    .from("roadmap_phases")
    .select("id, phase_number, status")
    .eq("roadmap_id", roadmapId)
    .order("phase_number", { ascending: true })

  if (!phases) return

  for (let i = 0; i < phases.length - 1; i++) {
    const currentPhase = phases[i]
    const nextPhase = phases[i + 1]

    if (currentPhase.status !== "active" && currentPhase.status !== "completed") break

    // Check if all tasks in current phase are complete
    const { data: phaseTasks } = await supabase
      .from("tasks")
      .select("is_completed")
      .eq("roadmap_phase_id", currentPhase.id)

    if (!phaseTasks) break

    const allComplete = phaseTasks.every((t: any) => t.is_completed)

    if (allComplete && currentPhase.status !== "completed") {
      // Mark current phase complete
      await supabase
        .from("roadmap_phases")
        .update({ status: "completed" })
        .eq("id", currentPhase.id)

      // Auto unlock next phase if condition is auto
      if (nextPhase.status === "locked") {
        await supabase
          .from("roadmap_phases")
          .update({
            status: "active",
            unlocked_at: new Date().toISOString(),
          })
          .eq("id", nextPhase.id)
      }
    }
  }
}

// ─────────────────────────────────────────
// MAIN SERVE FUNCTION
// ─────────────────────────────────────────
serve(async (req) => {
  // Helper — wraps Response with CORS headers
  const cors = (body: BodyInit | null, init?: ResponseInit): Response => {
    const headers = new Headers(init?.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    return new Response(body, { ...init, headers });
  };

  // Handle CORS preflight — must come before any body reading
  if (req.method === "OPTIONS") {
    return cors(null, { status: 204 });
  }

  // Read body as text first, then parse — avoids "Unexpected end of JSON input"
  let body: Record<string, unknown>;
  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return cors(JSON.stringify({ error: "Empty request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    body = JSON.parse(rawBody);
  } catch {
    return cors(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { action, userId, ...payload } = body as {
    action: string;
    userId: string;
    [key: string]: unknown;
  };

  if (!userId) {
    return cors(
      JSON.stringify({ error: "userId is required" }),
      { status: 400 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: GENERATE
  // Full roadmap generation from questionnaire
  // ─────────────────────────────────────────
  if (action === "generate") {
    const { answers, selectedPath, onboardingSessionId } = payload as {
      answers: QuestionnaireAnswers
      selectedPath?: string
      onboardingSessionId?: string
    }

    // Get user tier for token cap
    const { data: user } = await supabase
      .from("users")
      .select("tier, free_roadmap_used")
      .eq("id", userId)
      .single()

    if (!user) {
      return cors(
        JSON.stringify({ error: "user_not_found" }),
        { status: 404 }
      )
    }

    // Free tier — check one free roadmap limit
    if (user.tier === "free" && user.free_roadmap_used) {
      return cors(
        JSON.stringify({
          error: "free_roadmap_limit_reached",
          reason: "Free users can generate one roadmap. Upgrade to generate more.",
        }),
        { status: 403 }
      )
    }

    // Paid tiers — run XP preflight
    let reservedAmount = 0
    if (user.tier !== "free") {
      const preflightResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "preflight",
            userId,
            feature: "roadmap_generation",
          }),
        }
      )

      const preflight = await preflightResponse.json()

      if (!preflight.allowed) {
        return cors(
          JSON.stringify({ error: preflight.reason }),
          { status: 402 }
        )
      }

      reservedAmount = preflight.reservedAmount ?? 0
    }

    // Token cap based on tier
    const maxTokens =
      user.tier === "founder" ? 4000
        : user.tier === "operator" ? 3000
        : user.tier === "builder" ? 2000
        : 2000 // free tier onboarding gets same as builder

    // Create or update onboarding session
    let sessionId = onboardingSessionId

    if (!sessionId) {
      const { data: newSession } = await supabase
        .from("onboarding_sessions")
        .insert({
          user_id: userId,
          status: "generating",
          questionnaire_answers: answers,
          last_activity: new Date().toISOString(),
        })
        .select("id")
        .single()

      sessionId = newSession?.id
    } else {
      await supabase
        .from("onboarding_sessions")
        .update({
          status: "generating",
          questionnaire_answers: answers,
          last_activity: new Date().toISOString(),
        })
        .eq("id", sessionId)
    }

    // Call Gemini to compute profile
    let computedProfile: AIComputedProfile
    try {
      computedProfile = await callGeminiForProfile(answers, maxTokens)
    } catch (ex) {
      // Cancel XP reservation if paid tier
      if (user.tier !== "free") {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              action: "cancel",
              userId,
              feature: "roadmap_generation",
              reservedAmount,
            }),
          }
        )
      }

      return cors(
        JSON.stringify({ error: "profile_generation_failed", detail: String(ex) }),
        { status: 500 }
      )
    }

    // Select path
    const path =
      selectedPath ??
      computedProfile.path_scores.sort((a, b) => b.compatibility_rating - a.compatibility_rating)[0]?.name ??
      "Freelance Services"

    // Generate phase templates
    const rawPhases = await generatePhaseTemplates(
      computedProfile.primary_archetype,
      path,
      computedProfile.roadmap_input.major_tasks_suggestion,
      computedProfile,
      answers
    )
    const scoredPhases = enrichDifficultyScores(rawPhases)

    // Generate per-task AI goals and difficulty rationales
    const phases = await generateTaskGoalsAndRationales(
      scoredPhases,
      computedProfile,
      answers,
      path
    )

    // Deactivate any existing active roadmap for this user
    // (unique partial index enforces one active roadmap per user)
    await supabase
      .from("roadmaps")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("status", "active")

    // Write roadmap to database
    const { data: roadmap, error: roadmapError } = await supabase
      .from("roadmaps")
      .insert({
        user_id: userId,
        title: `${path} — ${computedProfile.primary_archetype} Roadmap`,
        archetype: computedProfile.primary_archetype,
        status: "active",
        current_phase: 1,
        total_phases: phases.length,
        roadmap_data: {
          phases,
          path,
          computedProfile,
          adjustedDeadline: computedProfile.roadmap_input.adjusted_deadline_months,
        },
        free_modifications_used: 0,
        is_free_tier: user.tier === "free",
        generated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (roadmapError || !roadmap) {
      return cors(
        JSON.stringify({ error: "roadmap_insert_failed" }),
        { status: 500 }
      )
    }

    // Write phases and tasks
    for (const phase of phases) {
      const { data: phaseRecord } = await supabase
        .from("roadmap_phases")
        .insert({
          roadmap_id: roadmap.id,
          user_id: userId,
          phase_number: phase.phase_number,
          phase_order: phase.phase_number,
          title: phase.title,
          description: phase.description,
          unlock_condition: phase.unlock_condition,
          status: phase.phase_number === 1 ? "active" : "locked",
        })
        .select("id")
        .single()

      if (!phaseRecord) continue

      for (const task of phase.tasks) {
        const { error: taskError } = await supabase.from("tasks").insert({
          roadmap_id: roadmap.id,
          roadmap_phase_id: phaseRecord.id,
          user_id: userId,
          title: task.title,
          description: task.description,
          goal_description: task.goal_description,
          difficulty_rationale: task.difficulty_rationale,
          task_type: task.task_type,
          difficulty: task.difficulty,
          difficulty_score: task.difficulty_score,
          is_major: task.is_major,
          xp_reward: task.xp_reward,
          order_index: task.order_index,
          status: "active",
          created_at: new Date().toISOString(),
        })
        if (taskError) {
          console.error("Task insert failed:", taskError)
        }
      }
    }

    // Update onboarding session to ready
    await supabase
      .from("onboarding_sessions")
      .update({
        status: "ready",
        computed_profile: computedProfile,
        current_archetype: computedProfile.primary_archetype,
        current_path: path,
        generated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    // Update persistent memory with archetype and psychology profile
    // Key-value pattern: memory_persistent uses (user_id, memory_key) pairs
    const persistentMemoryData: Record<string, unknown> = {
      user_stage: "onboarding_complete",
      long_term_goals: [computedProfile.psychology_profile.motivation_depth],
      strengths: computedProfile.archetype_cases[computedProfile.primary_archetype]?.strengths
        ? [computedProfile.archetype_cases[computedProfile.primary_archetype].strengths]
        : [],
      weaknesses: computedProfile.archetype_cases[computedProfile.primary_archetype]?.weaknesses
        ? [computedProfile.archetype_cases[computedProfile.primary_archetype].weaknesses]
        : [],
      execution_patterns: computedProfile.psychology_profile.discipline_triggers ?? [],
      roadmap_state: `Phase 1 active — ${path}`,
      primary_archetype: computedProfile.primary_archetype,
      secondary_archetype: computedProfile.secondary_archetype,
      recommended_path: path,
      limiting_beliefs: computedProfile.psychology_profile.limiting_beliefs ?? [],
      known_disruptors: computedProfile.psychology_profile.known_disruptors ?? [],
      bad_habits: computedProfile.psychology_profile.bad_habits ?? [],
    }

    for (const [key, value] of Object.entries(persistentMemoryData)) {
      const { error: memError } = await supabase
        .from("memory_persistent")
        .upsert(
          {
            user_id: userId,
            memory_key: key,
            memory_value: value,
            importance: key === "user_stage" || key === "primary_archetype" ? 5 : 3,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,memory_key" },
        )

      if (memError) {
        console.error(`Memory write failed for key ${key}:`, memError)
      }
    }

    // Mark onboarding complete on users table
    await supabase
      .from("users")
      .update({
        archetype: computedProfile.primary_archetype,
        onboarding_complete: true,
        free_roadmap_used: user.tier === "free" ? true : user.free_roadmap_used,
      })
      .eq("id", userId)

    // Write to onboarding_responses table (key-value: question_key + response jsonb)
    const fullProfileResponse = {
      answers,
      archetype: computedProfile.primary_archetype,
      secondary_archetype: computedProfile.secondary_archetype,
      path,
      roadmap_generated: true,
      generated_at: new Date().toISOString(),
    }

    const { data: existingResp } = await supabase
      .from("onboarding_responses")
      .select("id")
      .eq("user_id", userId)
      .eq("question_key", "full_profile")
      .maybeSingle()

    if (existingResp) {
      await supabase
        .from("onboarding_responses")
        .update({
          response: fullProfileResponse,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingResp.id)
    } else {
      await supabase.from("onboarding_responses").insert({
        user_id: userId,
        question_key: "full_profile",
        response: fullProfileResponse,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // Finalize XP billing for paid tiers
    if (user.tier !== "free") {
      const inputTokens = Math.ceil(JSON.stringify(answers).length / 4)
      const outputTokens = Math.ceil(JSON.stringify(computedProfile).length / 4)

      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "finalize",
            userId,
            feature: "roadmap_generation",
            totalTokens: inputTokens + outputTokens,
            modelUsed: "GEMINI",
          }),
        }
      )
    }

    return cors(
      JSON.stringify({
        success: true,
        roadmapId: roadmap.id,
        archetype: computedProfile.primary_archetype,
        secondaryArchetype: computedProfile.secondary_archetype,
        path,
        pathScores: computedProfile.path_scores,
        archetypeCases: computedProfile.archetype_cases,
        psychologyProfile: computedProfile.psychology_profile,
        totalPhases: phases.length,
        adjustedDeadline: computedProfile.roadmap_input.adjusted_deadline_months,
      }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: ENRICH EXISTING
  // Backfill AI-generated goal_description and
  // difficulty_rationale for existing roadmap tasks
  // ─────────────────────────────────────────
  if (action === "enrich_existing") {
    const { roadmapId } = payload as { roadmapId: string }

    if (!roadmapId) {
      return cors(
        JSON.stringify({ error: "roadmapId is required" }),
        { status: 400 }
      )
    }

    // Load roadmap with data
    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("id, roadmap_data, user_id")
      .eq("id", roadmapId)
      .single()

    if (!roadmap) {
      return cors(
        JSON.stringify({ error: "roadmap_not_found" }),
        { status: 404 }
      )
    }

    const rd = roadmap.roadmap_data as any
    const computedProfile = rd.computedProfile as AIComputedProfile
    const path = rd.path as string

    // Load tasks grouped by phase
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("roadmap_id", roadmapId)
      .order("order_index", { ascending: true })

    if (!tasks || tasks.length === 0) {
      return cors(
        JSON.stringify({ error: "no_tasks_found" }),
        { status: 404 }
      )
    }

    // Reconstruct PhaseTemplate array from DB tasks
    const phasesMap = new Map<number, TaskTemplate[]>()
    const taskPhaseMap = new Map<string, number>()
    for (const t of tasks) {
      const pn = t.phase_number ?? 1
      if (!phasesMap.has(pn)) phasesMap.set(pn, [])
      taskPhaseMap.set(t.id, pn)
      phasesMap.get(pn)!.push({
        title: t.title,
        description: t.description ?? "",
        goal_description: "",
        difficulty_rationale: "",
        task_type: t.task_type as TaskType,
        difficulty: t.difficulty as TaskDifficulty,
        difficulty_score: t.difficulty_score ?? computeDifficultyScore(
          t.difficulty as TaskDifficulty,
          t.task_type as TaskType,
          t.is_major ?? false
        ),
        is_major: t.is_major ?? false,
        xp_reward: t.xp_reward ?? 0,
        estimated_hours: t.estimated_hours ?? 2,
        order_index: t.order_index ?? 1,
      })
    }

    const phases: PhaseTemplate[] = Array.from(phasesMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([pn, phaseTasks]) => ({
        phase_number: pn,
        title: pn === 1 ? "Foundation" : pn === 2 ? "Validation" : "Scaling",
        description: "",
        unlock_condition: "auto" as const,
        tasks: phaseTasks,
      }))

    // Generate AI content
    const enriched = await generateTaskGoalsAndRationales(
      phases,
      computedProfile,
      { q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" },
      path
    )

    // Update tasks in DB
    let updated = 0
    for (const phase of enriched) {
      for (const task of phase.tasks) {
        await supabase
          .from("tasks")
          .update({
            goal_description: task.goal_description,
            difficulty_rationale: task.difficulty_rationale,
          })
          .eq("roadmap_id", roadmapId)
          .eq("title", task.title)
        updated++
      }
    }

    return cors(
      JSON.stringify({ success: true, tasks_enriched: updated })
    )
  }

  // ─────────────────────────────────────────
  // ACTION: SAVE DRAFT
  // Saves incomplete questionnaire answers
  // ─────────────────────────────────────────
  if (action === "save_draft") {
    const { sessionData, lastQuestionAnswered } = payload

    const { data: draft } = await supabase
      .from("draft_sessions")
      .insert({
        user_id: userId,
        session_data: sessionData,
        last_question_answered: lastQuestionAnswered,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    return cors(
      JSON.stringify({ success: true, draftId: draft?.id }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: GET DRAFTS
  // Returns list of saved drafts for user
  // ─────────────────────────────────────────
  if (action === "get_drafts") {
    const { data: drafts } = await supabase
      .from("draft_sessions")
      .select("id, last_question_answered, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    return cors(
      JSON.stringify({ drafts: drafts ?? [] }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: LOAD DRAFT
  // Returns full draft state for resuming
  // ─────────────────────────────────────────
  if (action === "load_draft") {
    const { draftId } = payload

    const { data: draft } = await supabase
      .from("draft_sessions")
      .select("session_data, last_question_answered")
      .eq("id", draftId)
      .eq("user_id", userId)
      .single()

    if (!draft) {
      return cors(
        JSON.stringify({ error: "draft_not_found" }),
        { status: 404 }
      )
    }

    return cors(
      JSON.stringify({ draft }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: COMPLETE TASK
  // Marks task complete, triggers auto unlock
  // check, checks 85% rule
  // ─────────────────────────────────────────
  if (action === "complete_task") {
    const { taskId, roadmapId } = payload

    // Fetch task XP reward before marking complete
    const { data: task } = await supabase
      .from("tasks")
      .select("xp_reward")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single()

    // Mark task complete
    await supabase
      .from("tasks")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", taskId)
      .eq("user_id", userId)

    // Award XP via billing manager with explicit amount
    const xpReward = task?.xp_reward ?? 0
    if (xpReward > 0) {
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing-manager`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "earn",
            userId,
            amount: xpReward,
            source: "task_completion",
            taskId: taskId,
          }),
        }
      )
    }

    // Check and auto unlock next phase
    await checkAndAutoUnlockPhase(roadmapId)

    // Check 85% rule for early unlock eligibility
    const { eligible, percentage } = await checkEarlyUnlockEligibility(roadmapId)

    // Update roadmap completion percentage
    const { data: allTasks } = await supabase
      .from("tasks")
      .select("is_completed")
      .eq("roadmap_id", roadmapId)

    const total = allTasks?.length ?? 0
    const completed = allTasks?.filter((t: any) => t.is_completed).length ?? 0
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0

    await supabase
      .from("roadmaps")
      .update({ completion_percentage: completionPercentage })
      .eq("id", roadmapId)

    return cors(
      JSON.stringify({
        success: true,
        completionPercentage,
        earlyUnlockEligible: eligible,
        completionPercentageTotal: percentage,
      }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: REQUEST EARLY UNLOCK
  // 85% completion required
  // Creates early_unlock_requests record
  // Mentor reviews and approves
  // ─────────────────────────────────────────
  if (action === "request_early_unlock") {
    const { roadmapId } = payload

    const { eligible, percentage } = await checkEarlyUnlockEligibility(roadmapId)

    if (!eligible) {
      return cors(
        JSON.stringify({
          error: "insufficient_completion",
          reason: `${percentage}% complete. Need 85% to request early unlock.`,
        }),
        { status: 400 }
      )
    }

    // Find first locked phase
    const { data: lockedPhase } = await supabase
      .from("roadmap_phases")
      .select("id, phase_number")
      .eq("roadmap_id", roadmapId)
      .eq("status", "locked")
      .order("phase_number", { ascending: true })
      .limit(1)
      .single()

    if (!lockedPhase) {
      return cors(
        JSON.stringify({ error: "no_locked_phases" }),
        { status: 400 }
      )
    }

    const { data: request } = await supabase
      .from("early_unlock_requests")
      .insert({
        roadmap_id: roadmapId,
        phase_id: lockedPhase.id,
        user_id: userId,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    return cors(
      JSON.stringify({
        success: true,
        requestId: request?.id,
        phaseNumber: lockedPhase.phase_number,
      }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: APPROVE EARLY UNLOCK
  // Called by mentor after reviewing request
  // Unlocks next locked phase only
  // ─────────────────────────────────────────
  if (action === "approve_early_unlock") {
    const { requestId } = payload

    const { data: request } = await supabase
      .from("early_unlock_requests")
      .select("phase_id, roadmap_id")
      .eq("id", requestId)
      .eq("status", "pending")
      .single()

    if (!request) {
      return cors(
        JSON.stringify({ error: "request_not_found" }),
        { status: 404 }
      )
    }

    // Unlock the phase
    await supabase
      .from("roadmap_phases")
      .update({
        status: "override_unlocked",
        unlocked_at: new Date().toISOString(),
      })
      .eq("id", request.phase_id)

    // Mark request approved
    await supabase
      .from("early_unlock_requests")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    return cors(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: REQUEST MODIFICATION
  // Checks free modification limit
  // Creates modification request
  // Mentor reviews via roadmap-modifier.ts
  // ─────────────────────────────────────────
  if (action === "request_modification") {
    const { roadmapId, requestedChanges } = payload

    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("free_modifications_used, is_free_tier")
      .eq("id", roadmapId)
      .single()

    if (!roadmap) {
      return cors(
        JSON.stringify({ error: "roadmap_not_found" }),
        { status: 404 }
      )
    }

    // Free tier modification limit
    if (roadmap.is_free_tier && roadmap.free_modifications_used >= 3) {
      return cors(
        JSON.stringify({
          error: "modification_limit_reached",
          reason: "Free users get 3 roadmap modifications. Upgrade to modify further.",
        }),
        { status: 403 }
      )
    }

    const { data: modRequest } = await supabase
      .from("modification_requests")
      .insert({
        roadmap_id: roadmapId,
        user_id: userId,
        requested_changes: requestedChanges,
        status: "pending_mentor_review",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    return cors(
      JSON.stringify({
        success: true,
        requestId: modRequest?.id,
        message: "Modification request sent to mentor for review.",
      }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: CONFIRM MODIFICATION
  // User confirms mentor approved change
  // Increments free_modifications_used
  // ─────────────────────────────────────────
  if (action === "confirm_modification") {
    const { requestId } = payload

    const { data: modRequest } = await supabase
      .from("modification_requests")
      .select("roadmap_id, requested_changes, status")
      .eq("id", requestId)
      .eq("user_id", userId)
      .single()

    if (!modRequest || modRequest.status !== "pending_mentor_review") {
      return cors(
        JSON.stringify({ error: "request_not_found_or_not_approved" }),
        { status: 404 }
      )
    }

    // Apply changes
    const changes = modRequest.requested_changes

    if (changes.task_updates) {
      for (const update of changes.task_updates) {
        await supabase
          .from("tasks")
          .update({
            title: update.title,
            description: update.description,
            difficulty: update.difficulty,
            task_type: update.task_type,
          })
          .eq("id", update.task_id)
          .eq("roadmap_id", modRequest.roadmap_id)
      }
    }

    if (changes.phase_updates) {
      for (const update of changes.phase_updates) {
        await supabase
          .from("roadmap_phases")
          .update({
            title: update.title,
            description: update.description,
          })
          .eq("id", update.phase_id)
          .eq("roadmap_id", modRequest.roadmap_id)
      }
    }

    // Mark request applied
    await supabase
      .from("modification_requests")
      .update({
        status: "applied",
        user_confirmed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    // Increment modification counter
    await supabase.rpc("increment_modifications", {
      p_roadmap_id: modRequest.roadmap_id,
    })

    return cors(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  }

  // ─────────────────────────────────────────
  // ACTION: DELETE ROADMAP
  // Soft delete — archives not hard deletes
  // Data preserved for memory system
  // ─────────────────────────────────────────
  if (action === "delete_roadmap") {
    const { roadmapId } = payload

    await supabase
      .from("roadmaps")
      .update({
        status: "archived",
        deleted_at: new Date().toISOString(),
      })
      .eq("id", roadmapId)
      .eq("user_id", userId)

    // Update user record
    await supabase
      .from("users")
      .update({ free_roadmap_used: false })
      .eq("id", userId)

    return cors(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  }

  return cors(
    JSON.stringify({ error: "unknown_action" }),
    { status: 400 }
  )
})

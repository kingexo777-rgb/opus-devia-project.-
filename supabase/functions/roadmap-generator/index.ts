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
    "You are RoadmapAI, a business psychology and strategy engine inside Opus Devia.",
    "Your task is to analyze a user's onboarding answers and output a structured JSON profile.",
    "",
    "DATA CONSTRAINT — ABSOLUTE:",
    "Use ONLY the answers provided. Do not fabricate information.",
    "Do not insert assumptions about the user's background, finances, or circumstances.",
    "If an answer is vague, extract what is there and flag low confidence.",
    "Never insert general statistics or external benchmarks as if they were the user's data.",
    "",
    "YOUR JOB:",
    "Read the six free-answer responses and extract a precise business psychology profile.",
    "Assign archetype scores, compute path compatibility, and generate roadmap inputs.",
    "",
    "ARCHETYPES:",
    "Closer: loves selling, high risk tolerance, gut decisions, people-first, fast revenue focus.",
    "Creator: loves making things, hates repetition, intuitive, audience-first, content/product driven.",
    "Strategist: data-driven, low risk, loves planning, vision-first, long game thinker.",
    "Operator: process-oriented, execution-driven, systems-first, detail focused, consistency over creativity.",
    "Maverick: contrarian, high risk, dislikes conformity, admires disruptors, cross-domain thinker, breaks rules deliberately.",
    "",
    "SCORING RULES:",
    "Closer: high risk tolerance + loves selling + gut decisions + people energy.",
    "Creator: loves making + hates repetition + intuitive + skill in design/dev/writing/content.",
    "Strategist: data-driven + low risk + loves planning + skill in analytics/finance/research.",
    "Operator: process-oriented + low risk + loves execution + skill in ops/management/systems.",
    "Maverick: contrarian answers + high risk + admires disruptors + cross-domain thinking + dislikes structure.",
    "",
    "PATH COMPATIBILITY MATH:",
    "For each business path compute:",
    "compat = 10 × (0.3 × skill_alignment + 0.25 × infrastructure_fit + 0.2 × time_energy + 0.25 × risk_motivation)",
    "Then adjust the raw score based on:",
    "- enjoyment_alignment: if high, boost score up to +1.5",
    "- failure_penalty: if high (user struggles with setbacks), reduce score up to -1.0",
    "- discipline_level: if low, reduce scores for high-consistency paths up to -1.0",
    "- ambition_level: if low, reduce scaling-heavy paths up to -0.5",
    "Final compatibility_rating = adjusted score rounded to one decimal. Cap at 10.",
    "Do not blindly apply the math. Analyse the answers first, then let the math confirm or adjust.",
    "",
    "PATHS TO SCORE (minimum 6):",
    "Freelance Services, Consulting, Agency, Content Creator, SaaS/Software, Ecommerce,",
    "Coaching, Digital Products, Community/Membership, Venture/Investing",
    "",
    "DEADLINE ADJUSTMENT:",
    "E_req = base_effort × (1 + (5 - risk_tolerance) / 10) × (1 + failure_penalty)",
    "If E_req > weekly_hours: adjusted_deadline = ceil(deadline_months × (E_req / weekly_hours))",
    "Else: adjusted_deadline = deadline_months",
    "Include adjusted_deadline_months in roadmap_input.",
    "",
    "OUTPUT FORMAT:",
    "Return ONLY valid JSON matching this exact structure.",
    "No markdown, no explanation, no preamble.",
    "",
    JSON.stringify({
      extracted_scores: {
        skill_alignment: 0.0,
        infrastructure_fit: 0.0,
        time_energy: 0.0,
        risk_motivation: 0.0,
        failure_penalty: 0.0,
        enjoyment_alignment: 0.0,
        discipline_level: 0.0,
        ambition_level: 0.0,
      },
      goal_metrics: {
        weekly_hours: 0,
        deadline_months: 0,
        risk_tolerance: 0,
      },
      archetype_scores: {
        Closer: 0.0,
        Creator: 0.0,
        Strategist: 0.0,
        Operator: 0.0,
        Maverick: 0.0,
      },
      primary_archetype: "",
      secondary_archetype: "",
      path_scores: [
        {
          name: "",
          score: 0.0,
          compatibility_rating: 0.0,
          best_for_archetypes: [],
          reason: "",
        },
      ],
      archetype_cases: {
        Closer: {
          strengths: "",
          weaknesses: "",
          advantages: "",
          blind_spots: "",
          case: "",
        },
        Creator: {
          strengths: "",
          weaknesses: "",
          advantages: "",
          blind_spots: "",
          case: "",
        },
        Strategist: {
          strengths: "",
          weaknesses: "",
          advantages: "",
          blind_spots: "",
          case: "",
        },
        Operator: {
          strengths: "",
          weaknesses: "",
          advantages: "",
          blind_spots: "",
          case: "",
        },
        Maverick: {
          strengths: "",
          weaknesses: "",
          advantages: "",
          blind_spots: "",
          case: "",
        },
      },
      psychology_profile: {
        loves: [],
        hates: [],
        discipline_triggers: [],
        known_disruptors: [],
        bad_habits: [],
        limiting_beliefs: [],
        admired_business_approach: "",
        decision_style: "",
        motivation_depth: "",
      },
      roadmap_input: {
        base_effort_hours: 0,
        adjusted_deadline_months: 0,
        major_tasks_suggestion: [],
        recommended_path: "",
      },
    }),
  ].join("\n")
}

// ─────────────────────────────────────────
// PHASE TEMPLATE ENGINE
// Generates 3 phases × 5 tasks
// Based on archetype + path combination
// Falls back to AI suggested tasks if no
// template match found
// ─────────────────────────────────────────
function generatePhaseTemplates(
  archetype: Archetype,
  path: string,
  majorTasksHint: string[]
): PhaseTemplate[] {
  // Template library — archetype + path combinations
  // Extend this as you add more paths and archetypes
  const templates: Record<string, Record<string, PhaseTemplate[]>> = {
    "Freelance Services": {
      Closer: [
        {
          phase_number: 1,
          title: "Foundation: Offer and Outreach",
          description: "Define your service, build credibility, and start reaching out to prospects.",
          unlock_condition: "auto",
          tasks: [
            { title: "Define your niche offer", description: "Write a clear one sentence value proposition that explains what you do, who for, and the result they get.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 50, estimated_hours: 4, order_index: 1 },
            { title: "Build a simple portfolio", description: "Create 2-3 samples of your work even if they are speculative. Credibility before outreach.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 40, estimated_hours: 5, order_index: 2 },
            { title: "Map your first 20 prospects", description: "List 20 specific people or businesses who could buy your service. Be specific — names, not categories.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 2, order_index: 3 },
            { title: "Send your first 10 outreach messages", description: "Personalised, short, and focused on their problem not your credentials.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 30, estimated_hours: 3, order_index: 4 },
            { title: "Follow up with non-responders", description: "One follow up per prospect. Most deals happen on the follow up not the first message.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 15, estimated_hours: 1, order_index: 5 },
          ],
        },
        {
          phase_number: 2,
          title: "Validation: Close Your First Client",
          description: "Convert interest into a signed agreement and deliver your first paid result.",
          unlock_condition: "auto",
          tasks: [
            { title: "Send 5 tailored proposals", description: "Each proposal addresses one specific pain point you identified in the prospect. Not a generic deck.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 60, estimated_hours: 5, order_index: 1 },
            { title: "Get on 3 discovery calls", description: "Listen more than you speak. Your job is to understand their problem deeply.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 40, estimated_hours: 3, order_index: 2 },
            { title: "Close your first client", description: "Sign an agreement. Any amount. Proof of concept is more valuable than the money right now.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 100, estimated_hours: 3, order_index: 3 },
            { title: "Deliver the first project", description: "Execute and deliver. First impressions set the standard for every referral that follows.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 80, estimated_hours: 10, order_index: 4 },
            { title: "Request a testimonial", description: "Ask immediately after delivery while the result is fresh. Written or video.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1, order_index: 5 },
          ],
        },
        {
          phase_number: 3,
          title: "Scaling: Systematise and Grow",
          description: "Turn one client into a repeatable system. Raise rates. Get referrals.",
          unlock_condition: "auto",
          tasks: [
            { title: "Create a delivery checklist", description: "Document every step of your service delivery so you can repeat it consistently and eventually delegate it.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 50, estimated_hours: 4, order_index: 1 },
            { title: "Ask your first 3 clients for referrals", description: "Referrals from happy clients convert at 3-4x the rate of cold outreach. Ask directly.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1, order_index: 2 },
            { title: "Raise your rates by 20-30 percent for new clients", description: "You now have proof. Price reflects it. Existing clients stay at old rate.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 30, estimated_hours: 2, order_index: 3 },
            { title: "Build a simple referral system", description: "Incentivise referrals with a small finder's fee or reciprocal arrangement. Make it automatic.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 40, estimated_hours: 3, order_index: 4 },
            { title: "Land your third client", description: "Three clients is proof of concept. Pattern recognition begins. Iterate on what worked.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 100, estimated_hours: 5, order_index: 5 },
          ],
        },
      ],
      Creator: [
        {
          phase_number: 1,
          title: "Foundation: Build Your Voice",
          description: "Find your angle, start creating, and build an initial audience.",
          unlock_condition: "auto",
          tasks: [
            { title: "Define your content angle", description: "What unique perspective do you bring? Who specifically are you talking to? One sentence.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 50, estimated_hours: 3, order_index: 1 },
            { title: "Choose one platform and commit", description: "Pick the platform where your audience already is. Do not spread across five. One only.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1, order_index: 2 },
            { title: "Publish your first 10 pieces of content", description: "Quantity builds skill faster than perfection. Ship ten before you judge any of them.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 40, estimated_hours: 8, order_index: 3 },
            { title: "Study your top performing piece", description: "What worked and why. Double down on that pattern.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 2, order_index: 4 },
            { title: "Engage with 20 people in your target audience", description: "Comments, replies, conversations. Audience building is relational before it is algorithmic.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 15, estimated_hours: 2, order_index: 5 },
          ],
        },
        {
          phase_number: 2,
          title: "Validation: Monetise the Audience",
          description: "Convert attention into your first dollar. Validate that people will pay.",
          unlock_condition: "auto",
          tasks: [
            { title: "Create a simple digital product", description: "A guide, template, or mini course. Price it low to remove friction. $9-49 range.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 80, estimated_hours: 10, order_index: 1 },
            { title: "Announce it to your audience", description: "Post about it. Email if you have a list. Direct message your most engaged followers.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1, order_index: 2 },
            { title: "Make your first sale", description: "One person paying for your work changes your psychology permanently. Get to one.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 100, estimated_hours: 3, order_index: 3 },
            { title: "Collect feedback from buyers", description: "Ask what they needed that you did not cover. This becomes your next product.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1, order_index: 4 },
            { title: "Reach 100 followers or subscribers", description: "Small number but it represents real humans who chose to follow you. Quality over quantity here.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 40, estimated_hours: 6, order_index: 5 },
          ],
        },
        {
          phase_number: 3,
          title: "Scaling: Build the Engine",
          description: "Systematise content creation and stack revenue streams.",
          unlock_condition: "auto",
          tasks: [
            { title: "Build a content calendar", description: "Batch create and schedule. Consistency beats brilliance at this stage.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 40, estimated_hours: 3, order_index: 1 },
            { title: "Add a second revenue stream", description: "Affiliate, consulting, higher priced product. Stack income sources that compound.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 80, estimated_hours: 8, order_index: 2 },
            { title: "Build or start an email list", description: "You do not own social media followers. You own your email list. Start it now if you have not.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 60, estimated_hours: 5, order_index: 3 },
            { title: "Reach 500 followers or subscribers", description: "The compound effect begins to show at this number.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 40, estimated_hours: 10, order_index: 4 },
            { title: "Review and double down on what converts", description: "Which content drives sales? Which platform drives growth? Eliminate the rest.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 2, order_index: 5 },
          ],
        },
      ],
    },
    "Consulting": {
      Strategist: [
        {
          phase_number: 1,
          title: "Foundation: Position Your Expertise",
          description: "Define your consulting niche, build authority signals, identify target clients.",
          unlock_condition: "auto",
          tasks: [
            { title: "Define your consulting niche precisely", description: "Not business consulting. Pick a specific problem for a specific type of business. The narrower the better at this stage.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 50, estimated_hours: 4, order_index: 1 },
            { title: "Document your methodology", description: "How do you solve the problem? What is your process? Systematise your thinking into a repeatable framework.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 60, estimated_hours: 6, order_index: 2 },
            { title: "Create one piece of authority content", description: "A detailed article, case study, or analysis that demonstrates your thinking. Not promotional.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 40, estimated_hours: 5, order_index: 3 },
            { title: "Identify 15 potential clients", description: "Businesses that have the problem you solve and can afford to pay for the solution.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 2, order_index: 4 },
            { title: "Reach out to 5 potential clients", description: "Lead with insight not a pitch. Share something useful about their specific situation.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 30, estimated_hours: 3, order_index: 5 },
          ],
        },
        {
          phase_number: 2,
          title: "Validation: Land Your First Engagement",
          description: "Convert a conversation into a paid consulting engagement.",
          unlock_condition: "auto",
          tasks: [
            { title: "Conduct 3 diagnostic conversations", description: "Not sales calls. Deep conversations to understand their problem. You are diagnosing not pitching.", task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 40, estimated_hours: 4, order_index: 1 },
            { title: "Write a scoped proposal", description: "Specific problem, specific outcome, specific timeline, specific price. No vague deliverables.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 60, estimated_hours: 5, order_index: 2 },
            { title: "Close your first consulting engagement", description: "Sign the agreement. Start date confirmed.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 100, estimated_hours: 3, order_index: 3 },
            { title: "Deliver and document your process", description: "Execute the engagement and document what you did and why. This builds your case study.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 80, estimated_hours: 15, order_index: 4 },
            { title: "Get a written case study or testimonial", description: "Before and after. What was the problem, what did you do, what was the result.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 30, estimated_hours: 2, order_index: 5 },
          ],
        },
        {
          phase_number: 3,
          title: "Scaling: Build Recurring Revenue",
          description: "Convert project work into retainers and build a pipeline.",
          unlock_condition: "auto",
          tasks: [
            { title: "Propose a retainer to your first client", description: "Ongoing advisory or implementation support. Monthly fee for defined access and output.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 80, estimated_hours: 3, order_index: 1 },
            { title: "Publish your case study", description: "Share the result publicly with client permission. This is your most powerful marketing asset.", task_type: "deep", difficulty: "medium", is_major: true, xp_reward: 50, estimated_hours: 4, order_index: 2 },
            { title: "Build a simple referral pipeline", description: "Ask clients who else they know. Accountants, lawyers, and advisors are excellent referral sources.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1, order_index: 3 },
            { title: "Raise your day rate", description: "With one case study you have proof. Price accordingly for new engagements.", task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1, order_index: 4 },
            { title: "Land your second client", description: "Second client validation means you have a repeatable model not a lucky break.", task_type: "deep", difficulty: "large", is_major: true, xp_reward: 100, estimated_hours: 5, order_index: 5 },
          ],
        },
      ],
    },
  }

  // Check for template match
  const pathTemplates = templates[path]
  if (pathTemplates && pathTemplates[archetype]) {
    return pathTemplates[archetype]
  }

  // Fallback: generate phases from AI suggested major tasks
  // Used when no template exists for the path/archetype combination
  return generateFallbackPhases(archetype, path, majorTasksHint)
}

// ─────────────────────────────────────────
// POST-PROCESS: Add difficulty_score,
// goal_description, and difficulty_rationale
// defaults to all template tasks.
// The AI generation step will overwrite
// goal/rationale with per-task content.
// ─────────────────────────────────────────
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
      "You are RoadmapAI task enrichment engine inside Opus Devia.",
      "Given a user profile and exactly 5 roadmap tasks from ONE phase, generate two fields for EACH task:",
      "",
      "1. goal_description (2-4 sentences):",
      "   - Explain WHY this SPECIFIC task helps THIS user on their path.",
      "   - Reference their archetype, strengths, weaknesses, or psychology directly.",
      "   - Tie it to this exact phase and path.",
      "   - NEVER use generic phrases. ALWAYS be task-specific.",
      "",
      "2. difficulty_rationale (2-4 sentences):",
      "   - Explain why this task has its EXACT difficulty_score out of 5.",
      "   - Break down the factors: base label, deep/shallow modifier, major milestone bonus.",
      "   - Final sentence MUST be: 'Final difficulty score: X/5.' where X is the exact difficulty_score shown.",
      "   - NEVER contradict the difficulty_score value.",
      "",
      "CONSTRAINTS:",
      "- Return ONLY valid JSON. No markdown. No preamble.",
      "- Each task output must be unique. No copy-pasting between tasks.",
      `- There are exactly ${phase.tasks.length} tasks. Return exactly ${phase.tasks.length} enriched tasks.`,
      "",
      'OUTPUT: { "tasks": [ { "task_index": 0, "goal_description": "...", "difficulty_rationale": "..." }, ... ] }',
    ].join("\n")

    const userInput = [
      "USER PROFILE:",
      `Path: ${path}`,
      `Primary Archetype: ${profile.primary_archetype}`,
      `Strengths: ${profile.archetype_cases[profile.primary_archetype]?.strengths ?? "N/A"}`,
      `Weaknesses: ${profile.archetype_cases[profile.primary_archetype]?.weaknesses ?? "N/A"}`,
      `Blind Spots: ${profile.archetype_cases[profile.primary_archetype]?.blind_spots ?? "N/A"}`,
      `Decision Style: ${profile.psychology_profile.decision_style}`,
      `Motivation: ${profile.psychology_profile.motivation_depth}`,
      `Discipline Triggers: ${(profile.psychology_profile.discipline_triggers ?? []).join(", ")}`,
      `Limiting Beliefs: ${(profile.psychology_profile.limiting_beliefs ?? []).join(", ")}`,
      "",
      `PHASE ${phase.phase_number} TASKS:`,
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

      let raw: string

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
            temperature: 0.4,
          }),
        })
        const data = await response.json()
        raw = data.choices?.[0]?.message?.content ?? ""
      } else {
        const fullPrompt = `${systemPrompt}\n\n${userInput}`
        const response = await fetch(
          `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: { maxOutputTokens: 2000, temperature: 0.4 },
            }),
          }
        )
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
            goal_description: enriched?.goal_description || "",
            difficulty_rationale: enriched?.difficulty_rationale || "",
          }
        }),
      })
    } catch (ex) {
      console.error(`Phase ${phase.phase_number} enrichment failed:`, ex)
      // Push phase unchanged — frontend handles empty strings gracefully
      enrichedPhases.push(phase)
    }
  }

  return enrichedPhases
}

function generateFallbackPhases(
  archetype: Archetype,
  path: string,
  majorTasksHint: string[]
): PhaseTemplate[] {
  const phaseNames = [
    { title: "Foundation: Build the Base", description: `Establish the core elements of your ${path} business.` },
    { title: "Validation: Prove the Concept", description: "Get your first real market signal." },
    { title: "Scaling: Build the Engine", description: "Turn one win into a repeatable system." },
  ]

  // Default task attrs per phase — always guarantees 5 tasks per phase
  const defaultAttrs: Record<number, Omit<TaskTemplate, "title" | "description" | "order_index" | "difficulty_score" | "goal_description" | "difficulty_rationale">[]> = {
    1: [
      { task_type: "deep", difficulty: "large", is_major: true, xp_reward: 80, estimated_hours: 6 },
      { task_type: "shallow", difficulty: "medium", is_major: false, xp_reward: 50, estimated_hours: 3 },
      { task_type: "deep", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1 },
      { task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1 },
      { task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 30, estimated_hours: 2 },
    ],
    2: [
      { task_type: "deep", difficulty: "large", is_major: true, xp_reward: 100, estimated_hours: 5 },
      { task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 50, estimated_hours: 3 },
      { task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1 },
      { task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 40, estimated_hours: 3 },
      { task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1 },
    ],
    3: [
      { task_type: "deep", difficulty: "large", is_major: true, xp_reward: 120, estimated_hours: 6 },
      { task_type: "deep", difficulty: "large", is_major: false, xp_reward: 80, estimated_hours: 4 },
      { task_type: "deep", difficulty: "medium", is_major: false, xp_reward: 50, estimated_hours: 3 },
      { task_type: "shallow", difficulty: "medium", is_major: false, xp_reward: 30, estimated_hours: 1 },
      { task_type: "shallow", difficulty: "small", is_major: false, xp_reward: 20, estimated_hours: 1 },
    ],
  }

  return phaseNames.map((phase, phaseIndex) => {
    const pn = phaseIndex + 1
    const hintStart = phaseIndex * 5
    const hints = majorTasksHint.slice(hintStart, hintStart + 5)

    // Always use padding pools — hints only replace titles if available
    const paddingPool = pn === 2 ? PHASE2_PADDING_TASKS : pn === 3 ? PHASE3_PADDING_TASKS : null
    const attrs = defaultAttrs[pn] ?? defaultAttrs[1]

    const tasks: TaskTemplate[] = attrs.map((dt, i) => {
      // Use hint title if available, otherwise use padding pool, otherwise generic
      const title = hints[i]
        ?? paddingPool?.[i]?.title
        ?? `${phase.title.split(":")[0]} milestone ${i + 1}`

      const description = paddingPool?.[i]?.desc
        ?? `Complete this task as part of your ${phase.title.split(":")[0].toLowerCase()} phase.`

      const score = computeDifficultyScore(dt.difficulty, dt.task_type, dt.is_major)

      return {
        title,
        description,
        goal_description: "",
        difficulty_rationale: "",
        task_type: dt.task_type,
        difficulty: dt.difficulty,
        difficulty_score: score,
        is_major: dt.is_major,
        xp_reward: dt.xp_reward,
        estimated_hours: dt.estimated_hours,
        order_index: i + 1,
      }
    })

    return {
      phase_number: pn,
      title: phase.title,
      description: phase.description,
      unlock_condition: "auto" as const,
      tasks,
    }
  })
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

  // Detect OpenRouter by API key prefix (sk-or-v1-...)
  const isOpenRouter = apiKey.startsWith("sk-or-")

  // OpenRouter's correct API base is openrouter.ai (NOT api.openrouter.ai)
  const baseUrl = isOpenRouter
    ? "https://openrouter.ai/api/v1"
    : rawBaseUrl.replace(/^http:\/\//, "https://")

  if (isOpenRouter) {
    // ── OpenRouter: OpenAI-compatible chat completions ──
    const response = await fetch(
      `${baseUrl}/chat/completions`,
      {
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
      }
    )

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content ?? ""

    // Parse JSON — retry once if fails
    try {
      const clean = raw.replace(/```json|```/g, "").trim()
      return JSON.parse(clean) as AIComputedProfile
    } catch {
      const retryResponse = await fetch(
        `${baseUrl}/chat/completions`,
        {
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
        }
      )
      const retryData = await retryResponse.json()
      const retryRaw = retryData.choices?.[0]?.message?.content ?? ""
      const retryClean = retryRaw.replace(/```json|```/g, "").trim()
      return JSON.parse(retryClean) as AIComputedProfile
    }
  }

  // ── Native Gemini API ──
  const fullPrompt = `${systemPrompt}\n\n${userInput}`

  const response = await fetch(
    `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
        },
      }),
    }
  )

  const data = await response.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

  // Parse JSON — retry once if fails
  try {
    const clean = raw.replace(/```json|```/g, "").trim()
    return JSON.parse(clean) as AIComputedProfile
  } catch {
    const retryResponse = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt + "\n\nReturn ONLY valid JSON. No markdown, no explanation." }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 },
        }),
      }
    )
    const retryData = await retryResponse.json()
    const retryRaw = retryData.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    const retryClean = retryRaw.replace(/```json|```/g, "").trim()
    return JSON.parse(retryClean) as AIComputedProfile
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
    const rawPhases = generatePhaseTemplates(
      computedProfile.primary_archetype,
      path,
      computedProfile.roadmap_input.major_tasks_suggestion
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
    const { data: task, error: taskFetchError } = await supabase
      .from("tasks")
      .select("xp_reward")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single()

    if (taskFetchError) {
      return cors(
        JSON.stringify({ error: "task_fetch_failed", reason: taskFetchError.message }),
        { status: 500 }
      )
    }

    if (!task) {
      return cors(
        JSON.stringify({ error: "task_not_found", reason: "Task not found for this user." }),
        { status: 404 }
      )
    }

    // Mark task complete
    const { error: taskUpdateError } = await supabase
      .from("tasks")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", taskId)
      .eq("user_id", userId)

    if (taskUpdateError) {
      return cors(
        JSON.stringify({ error: "task_update_failed", reason: taskUpdateError.message }),
        { status: 500 }
      )
    }

    // Award XP via billing manager with explicit amount
    const xpReward = task.xp_reward ?? 50
    if (xpReward > 0) {
      const billingResp = await fetch(
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

      if (!billingResp.ok) {
        const billingText = await billingResp.text();
        return cors(
          JSON.stringify({
            error: "billing_manager_failed",
            reason: billingText || billingResp.statusText,
          }),
          { status: billingResp.status }
        )
      }

      const billingData = await billingResp.json().catch(() => null)
      if (!billingData || billingData.success !== true) {
        return cors(
          JSON.stringify({
            error: "billing_manager_failed",
            reason: billingData?.reason ?? JSON.stringify(billingData) ?? "unknown",
          }),
          { status: 500 }
        )
      }
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

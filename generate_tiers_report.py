"""Generate the Opus Devia Tiers, XP & Billing Deep-Dive Report as PDF."""
from fpdf import FPDF
from datetime import date


class Report(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(120, 0, 0)
        self.cell(0, 6, "Opus Devia -- Tiers, XP & Billing Architecture", align="C")
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def chapter(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(154, 0, 0)
        self.cell(0, 10, title)
        self.ln(8)

    def subchapter(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(60, 60, 60)
        self.cell(0, 7, title)
        self.ln(6)

    def body(self, text):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 4.5, text)
        self.ln(2)

    def code_block(self, text):
        self.set_font("Courier", "", 7.5)
        self.set_text_color(30, 30, 30)
        self.set_fill_color(245, 245, 245)
        for line in text.split("\n"):
            self.cell(0, 4, line, fill=True)
            self.ln()
        self.ln(2)

    def bullet(self, text, indent=10):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 40)
        x = self.get_x()
        self.cell(indent, 4.5, "")
        self.set_font("Helvetica", "", 9)
        bullet_char = "*"
        self.cell(5, 4.5, bullet_char)
        self.multi_cell(0, 4.5, text)
        self.ln(0.5)

    def table_header(self, cols, widths):
        self.set_fill_color(154, 0, 0)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 8)
        for i, col in enumerate(cols):
            self.cell(widths[i], 6, col, border=1, fill=True, align="C")
        self.ln()

    def table_row(self, data, widths, fill=False):
        if fill:
            self.set_fill_color(248, 248, 248)
        else:
            self.set_fill_color(255, 255, 255)
        self.set_text_color(40, 40, 40)
        self.set_font("Helvetica", "", 8)
        for i, d in enumerate(data):
            self.cell(widths[i], 5.5, str(d), border=1, fill=True, align="C")
        self.ln()


def build():
    pdf = Report("P", "mm", "A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(True, 20)
    pdf.add_page()

    # -- Title Page --
    pdf.ln(30)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(154, 0, 0)
    pdf.cell(0, 14, "Opus Devia", align="C")
    pdf.ln(14)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 10, "Tiers, XP Economy & Billing Framework", align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, "Complete Architecture Deep-Dive", align="C")
    pdf.ln(16)
    pdf.set_draw_color(154, 0, 0)
    pdf.line(60, pdf.get_y(), 150, pdf.get_y())
    pdf.ln(12)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 7, f"Generated: {date.today().strftime('%B %d, %Y')}", align="C")
    pdf.ln(7)
    pdf.cell(0, 7, "Source: kin workspace -- supabase/functions + migrations + opus-devia/src", align="C")
    pdf.ln(14)

    # -- Table of Contents --
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(154, 0, 0)
    pdf.cell(0, 9, "Table of Contents")
    pdf.ln(10)
    toc = [
        "1. Executive Summary",
        "2. The Four Tiers -- Full Comparison",
        "3. Tier-Dependent Infrastructure (Storage, Rollover)",
        "4. XP Economy -- Data Model",
        "5. XP Economy -- RPC Functions (Reserve / Deduct / Credit / Rollover)",
        "6. billing-manager Edge Function -- XP Gateway",
        "7. XP Reservations & Dead Letter Queue",
        "8. Billing Tier Governance (Feature Gating & Token Budgets)",
        "9. Model Routing & Provider Architecture",
        "10. Frontend XP Integration (Profile, Home, Settings)",
        "11. Performance Metrics & Community XP Sync",
        "12. End-to-End XP Lifecycle (Walkthrough)",
        "13. Key Architectural Decisions & Trade-offs",
    ]
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(60, 60, 60)
    for t in toc:
        pdf.cell(0, 6, t)
        pdf.ln(6)
    pdf.ln(6)

    # ===============================================
    # 1. EXECUTIVE SUMMARY
    # ===============================================
    pdf.add_page()
    pdf.chapter("1. Executive Summary")
    pdf.body(
        "Opus Devia implements a four-tier freemium model (Free, Builder, Operator, Founder) with "
        "XP (Experience Points) as the universal currency that gates every AI feature. XP is not cosmetic "
        "-- it is the literal fuel that powers AI interactions. Each message to the Mentor, Assistant, "
        "or background analysis engine costs XP from one of three pools (earned, purchased, rollover). "
        "The system uses a dual-write reservation pattern (preflight -> finalize/cancel) to prevent race "
        "conditions and overspend, backed by atomic PostgreSQL RPCs running as SECURITY DEFINER. "
        "A monthly cron-triggered rollover process transfers a tier-dependent percentage of unused earned "
        "XP into the rollover pool, with Free tier users forfeiting 100%."
    )
    pdf.body(
        "Key numbers: 17 features are gated by tier, 6 AI model providers are routed dynamically, "
        "4 XP pools are tracked per user (earned, purchased, rollover, reserved), and the entire system "
        "outputs immutable transaction logs with idempotency keys for auditability."
    )

    # ===============================================
    # 2. THE FOUR TIERS
    # ===============================================
    pdf.add_page()
    pdf.chapter("2. The Four Tiers -- Full Comparison")
    pdf.body(
        "Tiers are stored as a PostgreSQL enum (`user_tier`) on the `users` table. "
        "Each tier unlocks progressively more features, higher token budgets, larger storage limits, "
        "larger rollover percentages, and higher XP earning multipliers."
    )

    cols = ["Attribute", "Free", "Builder", "Operator", "Founder"]
    w = [38, 36, 36, 36, 36]
    pdf.table_header(cols, w)
    pdf.table_row(["Monthly Token Budget", "50,000", "150,000", "400,000", "1,000,000"], w, True)
    pdf.table_row(["Storage Limit", "50 MB", "500 MB", "2 GB", "10 GB"], w)
    pdf.table_row(["Rollover %", "0%", "25%", "50%", "100%"], w, True)
    pdf.table_row(["XP Multiplier", "1x", "1.5x", "2x", "3x"], w)
    pdf.table_row(["Mentor Support", "No", "Yes", "Yes", "Yes"], w, True)
    pdf.table_row(["Voice I/O", "No", "Yes", "Yes", "Yes"], w)
    pdf.table_row(["Image Upload", "No", "No", "Yes", "Yes"], w, True)
    pdf.table_row(["Roadmap Generation", "No", "No", "Yes", "Yes"], w)
    pdf.table_row(["Roadmap Recalibration", "No", "No", "Yes", "Yes"], w, True)
    pdf.table_row(["Weekly/Monthly Review", "No", "Daily only", "All", "All"], w)
    pdf.table_row(["Chat Pattern Analysis", "No", "No", "Yes", "Yes"], w, True)
    pdf.table_row(["Memory Tagging (auto)", "No", "Yes", "Yes", "Yes"], w)
    pdf.ln(4)

    pdf.body(
        "Source: `BILLING_TIERS` constant in supabase/functions/_shared/governance/constants.ts. "
        "Storage limits are enforced via a PostgreSQL trigger (`enforce_storage_tier_limit`). "
        "Rollover percentages are computed by `get_rollover_percentage(tier)` SQL function. "
        "XP multipliers are in `XP_MULTIPLIERS` constant in billing-manager/index.ts."
    )

    # ===============================================
    # 3. TIER-DEPENDENT INFRASTRUCTURE
    # ===============================================
    pdf.add_page()
    pdf.chapter("3. Tier-Dependent Infrastructure")

    pdf.subchapter("3.1 Storage Limits")
    pdf.body(
        "The SQL function `get_storage_limit_bytes(tier)` returns per-tier byte limits. "
        "A BEFORE INSERT/UPDATE trigger on `user_storage` calls `enforce_storage_tier_limit()` "
        "which looks up the user's tier, adds the new file size to existing usage, and raises "
        "an exception if the total exceeds the limit. This is enforced at the database level, "
        "not in application code."
    )
    pdf.code_block(
        "Free:      52,428,800 B  (50 MB)\n"
        "Builder:   524,288,000 B (500 MB)\n"
        "Operator:  2,147,483,648 B (2 GB)\n"
        "Founder:   10,737,418,240 B (10 GB)"
    )

    pdf.subchapter("3.2 Rollover Percentages")
    pdf.body(
        "At each monthly billing cycle, `process_monthly_xp_rollover()` runs. It computes how much "
        "earned XP rolls over based on tier. Free tier users forfeit all unused earned XP. "
        "Builder retains 25%, Operator 50%, Founder 100%. The rolled-over XP moves from `earned` to "
        "`rollover` pool; the remainder is forfeited. All movements are logged in `xp_transactions` "
        "with balance snapshots."
    )

    pdf.subchapter("3.3 XP Earning Multipliers")
    pdf.body(
        "When a user completes a task or earns XP via the `billing-manager` 'earn' action, "
        "the base amount is multiplied by the tier multiplier before being credited to the earned pool. "
        "Free = 1x, Builder = 1.5x, Operator = 2x, Founder = 3x."
    )

    # ===============================================
    # 4. XP ECONOMY -- DATA MODEL
    # ===============================================
    pdf.add_page()
    pdf.chapter("4. XP Economy -- Data Model")

    pdf.subchapter("4.1 Table: user_xp (one row per user)")
    pdf.body("The central XP ledger. Created automatically on signup via the `handle_new_user()` trigger.")
    pdf.code_block(
        "user_xp (\n"
        "  user_id      uuid PRIMARY KEY  -> FK to users(id)\n"
        "  earned       bigint NOT NULL DEFAULT 0  (acquired via tasks)\n"
        "  purchased    bigint NOT NULL DEFAULT 0  (acquired via payment)\n"
        "  rollover     bigint NOT NULL DEFAULT 0  (carried from previous cycle)\n"
        "  reserved_xp  bigint NOT NULL DEFAULT 0  (locked for in-flight AI calls)\n"
        "  created_at   timestamptz\n"
        "  updated_at   timestamptz\n"
        "  CONSTRAINT reserved_within_total:\n"
        "    reserved_xp <= earned + purchased + rollover\n"
        ")"
    )
    pdf.body(
        "All four balance columns have non-negative CHECK constraints. "
        "The critical invariant is: available_xp = earned + purchased + rollover - reserved_xp. "
        "Available XP must be - 0 and must be - the amount being reserved or deducted."
    )

    pdf.subchapter("4.2 Table: xp_transactions (immutable audit log)")
    pdf.body("Every XP mutation is recorded as an immutable row with full balance snapshots.")
    pdf.code_block(
        "xp_transactions (\n"
        "  id              uuid PK\n"
        "  user_id         uuid FK\n"
        "  transaction_type: 'earn'|'purchase'|'deduct'|'reserve'|'release'|\n"
        "                    'rollover_transfer'|'refund'\n"
        "  amount          bigint   (absolute value of operation)\n"
        "  delta_rollover  bigint   (change to rollover pool)\n"
        "  delta_purchased bigint   (change to purchased pool)\n"
        "  delta_earned    bigint   (change to earned pool)\n"
        "  delta_reserved  bigint   (change to reserved pool)\n"
        "  balance_rollover bigint  (post-operation snapshot)\n"
        "  balance_purchased bigint\n"
        "  balance_earned  bigint\n"
        "  balance_reserved bigint\n"
        "  reference_type  text     (e.g. 'billing_cycle', 'session')\n"
        "  reference_id    uuid\n"
        "  idempotency_key text UNIQUE(user_id, idempotency_key)\n"
        "  description     text\n"
        "  metadata        jsonb\n"
        "  created_at      timestamptz\n"
        ")"
    )

    pdf.subchapter("4.3 Table: xp_reservations (in-flight locks)")
    pdf.body(
        "Tracks active reservations with automatic TTL expiry after 15 minutes. "
        "Created during preflight, cleared during finalize or cancel. "
        "Expired reservations can be cleaned up by a background job."
    )
    pdf.code_block(
        "xp_reservations (\n"
        "  id         uuid PK\n"
        "  user_id    uuid FK\n"
        "  amount     integer\n"
        "  feature    text       (which feature reserved)\n"
        "  status     text       'active' | 'expired' | 'released'\n"
        "  expires_at timestamptz (now() + 15 min)\n"
        "  created_at timestamptz\n"
        ")"
    )

    pdf.subchapter("4.4 Table: dead_letter_reservations")
    pdf.body(
        "Dead letter queue for failed cancellations requiring manual resolution. "
        "When a cancel/finalize fails (e.g., network partition with the database), "
        "the reservation details are written here so ops can reconcile."
    )
    pdf.code_block(
        "dead_letter_reservations (\n"
        "  id          uuid PK\n"
        "  user_id     uuid FK\n"
        "  amount      integer\n"
        "  reason      text\n"
        "  status      text    'pending' | 'resolved'\n"
        "  created_at  timestamptz\n"
        "  resolved_at timestamptz\n"
        ")"
    )

    # ===============================================
    # 5. XP RPC FUNCTIONS
    # ===============================================
    pdf.add_page()
    pdf.chapter("5. XP Economy -- RPC Functions")

    pdf.body(
        "All XP mutations execute as PostgreSQL RPC functions with SECURITY DEFINER. "
        "This means they run with elevated privileges regardless of the caller's role, "
        "ensuring atomicity and enforcing invariants at the database level."
    )

    pdf.subchapter("5.1 reserve_xp(p_user_id, p_amount, ...)")
    pdf.body(
        "Atomically locks the user_xp row (SELECT ... FOR UPDATE), checks available XP "
        "(earned + purchased + rollover - reserved_xp), increments reserved_xp, and logs "
        "a 'reserve' transaction. Returns the transaction ID. Raises exception if insufficient."
    )
    pdf.code_block("available = rollover + purchased + earned - reserved_xp\n"
                   "IF available < amount -> RAISE EXCEPTION\n"
                   "reserved_xp = reserved_xp + amount\n"
                   "log_xp_transaction('reserve', amount, d__reserved=+amount)")

    pdf.subchapter("5.2 release_xp_reservation(p_user_id, p_amount, ...)")
    pdf.body(
        "Reverses a reservation. Row-locks user_xp, decrements reserved_xp (verifying it doesn't "
        "go below 0), logs a 'release' transaction with d__reserved = -amount."
    )

    pdf.subchapter("5.3 deduct_xp(p_user_id, p_amount, p_from_reservation, ...)")
    pdf.body(
        "The core spending function. Supports two modes: (1) deducting from a prior reservation "
        "(only touches reserved_xp), or (2) direct deduction from available pools. "
        "Deduction waterfall order: rollover -> purchased -> earned. "
        "Each pool is drained up to the remaining amount before moving to the next. "
        "If any amount remains after all pools exhausted, raises exception."
    )
    pdf.code_block("Waterfall:\n"
                   "  IF rollover > 0: take = MIN(rollover, remaining), d__rollover = -take\n"
                   "  IF purchased > 0: take = MIN(purchased, remaining), d__purchased = -take\n"
                   "  IF earned > 0: take = MIN(earned, remaining), d__earned = -take\n"
                   "  IF remaining > 0: RAISE EXCEPTION 'pool exhaustion'")

    pdf.subchapter("5.4 credit_xp(p_user_id, p_amount, p_pool, ...)")
    pdf.body(
        "Credits XP to one of three pools: 'earned', 'purchased', or 'rollover'. "
        "The pool parameter determines which column is incremented and which transaction_type "
        "is logged ('earn', 'purchase', or 'rollover_transfer')."
    )

    pdf.subchapter("5.5 log_xp_transaction(...) -- Universal Logger")
    pdf.body(
        "Records all XP mutations with full deltas AND balance snapshots. Supports idempotency "
        "via UNIQUE(user_id, idempotency_key). If the same idempotency key is replayed, "
        "the function returns the existing transaction ID instead of creating a duplicate."
    )

    pdf.subchapter("5.6 process_monthly_xp_rollover() -- Cron Job")
    pdf.body(
        "Iterates over all user_xp rows with earned > 0. Looks up tier, computes rollover "
        "percentage. Free tier (0%): all earned XP forfeited (set to 0). Paid tiers: "
        "transfer = FLOOR(earned * pct) moves to rollover; remainder forfeited. "
        "Logs every operation with idempotency key 'rollover-{user_id}-{YYYY-MM}'."
    )

    # ===============================================
    # 6. BILLING-MANAGER EDGE FUNCTION
    # ===============================================
    pdf.add_page()
    pdf.chapter("6. billing-manager Edge Function -- XP Gateway")

    pdf.body(
        "Location: supabase/functions/billing-manager/index.ts. "
        "This is the single HTTP entry point for all XP operations from the frontend and other "
        "edge functions. It acts as a thin coordinator that delegates heavy lifting to PostgreSQL RPCs."
    )

    pdf.subchapter("6.1 Estimated XP Costs (ESTIMATED_XP_COST)")
    pdf.body("Each feature has a pre-configured estimated XP cost used during the preflight phase:")
    cols2 = ["Feature", "Est. XP", "Feature", "Est. XP"]
    w2 = [52, 24, 52, 24]
    pdf.table_header(cols2, w2)
    costs = [
        ("mentor_message", "5", "assistant_message", "2"),
        ("roadmap_assistant_msg", "2", "journal_assistant_msg", "1"),
        ("image_upload", "3", "roadmap_generation", "10"),
        ("roadmap_recalibration", "8", "weekly_review", "6"),
        ("daily_review", "3", "monthly_breakdown", "10"),
        ("voice_session_free", "40", "voice_session_paid", "20"),
        ("deep_research", "18", "summarization", "0"),
        ("memory_tagging", "0", "journal_classification", "0"),
        ("intent_detection", "0", "chat_pattern_analysis", "0"),
    ]
    fill = True
    for a, b, c, d in costs:
        pdf.table_row([a, b, c, d], w2, fill)
        fill = not fill
    pdf.ln(4)

    pdf.subchapter("6.2 Actions")
    pdf.body("The edge function accepts JSON with an 'action' field:")
    pdf.bullet("preflight: Checks available XP, invokes reserve_xp() RPC. Returns allowed=true/false.")
    pdf.bullet("finalize: Releases reservation, deducts actual XP (ceil(tokens/2000)), invokes deduct_xp().")
    pdf.bullet("cancel: Releases reservation. Used when the AI call fails.")
    pdf.bullet("earn: Looks up tier multiplier, credits earned XP pool. Used on task completion.")

    pdf.subchapter("6.3 Deduction Order (deductFromPools)")
    pdf.body(
        "The edge function also contains a JavaScript-side `deductFromPools()` that mirrors the "
        "database `deduct_xp` RPC. This is likely a fallback/legacy path. The authoritative "
        "deduction order in both implementations is: rollover -> purchased -> earned."
    )

    # ===============================================
    # 7. XP RESERVATIONS & DEAD LETTER
    # ===============================================
    pdf.add_page()
    pdf.chapter("7. XP Reservations & Dead Letter Queue")
    pdf.body(
        "Migration: 20260606160000_xp_reservations_and_dead_letter.sql."
    )
    pdf.subchapter("7.1 Reservation Flow")
    pdf.body(
        "1. preflight -> billing-manager calls reserve_xp() RPC -> creates xp_reservations row with 15-min TTL\n"
        "2. AI call executes (may take several seconds)\n"
        "3a. Success -> finalize -> release_xp_reservation() + deduct_xp() -> reservation cleared\n"
        "3b. Failure -> cancel -> release_xp_reservation() -> reservation cleared\n"
        "3c. Timeout (no response) -> reservation auto-expires at expires_at, cleaned by cron"
    )
    pdf.body(
        "This pattern prevents double-spending: XP is locked (reserved) BEFORE the AI call, "
        "so two concurrent requests can't both spend the same XP."
    )

    pdf.subchapter("7.2 Dead Letter Queue")
    pdf.body(
        "If cancel fails (e.g., database becomes unreachable during release), the system writes "
        "to `dead_letter_reservations`. An ops process or manual resolution can then inspect "
        "these and reconcile. Status is 'pending' until resolved."
    )

    # ===============================================
    # 8. BILLING TIER GOVERNANCE
    # ===============================================
    pdf.add_page()
    pdf.chapter("8. Billing Tier Governance (Feature Gating & Token Budgets)")

    pdf.body(
        "Location: supabase/functions/_shared/governance/constants.ts -- BILLING_TIERS constant."
    )

    pdf.subchapter("8.1 Feature Allowlist Per Tier")
    pdf.body(
        "Each tier has an explicit `allowedFeatures` array. The function `tierAllowsFeature(tier, feature)` "
        "checks membership. This is called by the AI router (`routeAIRequest`) before any model call. "
        "If the user's tier doesn't allow the feature, a `GovernanceViolationError` is thrown."
    )
    pdf.body(
        "Free tier gets only: assistant_message, summarization, intent_detection, journal_classification. "
        "No mentor, no voice, no roadmap generation, no reviews. "
        "Builder adds mentor, voice, daily review, memory tagging, journal assistant, roadmap assistant. "
        "Operator and Founder add everything (image upload, roadmap gen, recalibration, all reviews, "
        "chat pattern analysis)."
    )

    pdf.subchapter("8.2 Monthly Token Budgets")
    pdf.body(
        "Token budgets are declared per tier (50K / 150K / 400K / 1M) but enforcement is not visible "
        "in the current codebase's billing-manager. This appears to be a declared limit for future "
        "enforcement or dashboard display. The actual per-call XP cost is token-based: "
        "actualXp = ceil(totalTokens / 2000) in the finalize action."
    )

    # ===============================================
    # 9. MODEL ROUTING
    # ===============================================
    pdf.add_page()
    pdf.chapter("9. Model Routing & Provider Architecture")
    pdf.body(
        "Six AI providers are configured, each mapped to specific features. The function "
        "`resolveProviderForFeature(feature)` returns the provider, then `getCredentialsForFeature()` "
        "loads API keys from Deno.env (Supabase Edge secrets)."
    )

    cols3 = ["Provider", "Model Backend", "Features Served", "User-Facing"]
    w3 = [26, 36, 88, 24]
    pdf.table_header(cols3, w3)
    routes = [
        ("MENTOR", "DeepSeek V4 Pro", "mentor_message", "Yes"),
        ("ASSISTANT", "Gemini 2.5 Flash", "assistant, roadmap_asst, journal_asst, image_upload", "Yes"),
        ("GEMINI", "Gemini 2.5 Flash", "roadmap_gen, recalibration, weekly/monthly/daily review", "Yes"),
        ("DEEPSEEK", "DeepSeek V4 Flash", "summarization, memory_tagging, journal_classification, intent_detection, chat_pattern_analysis", "No (bg)"),
        ("OPENAI_TTS", "OpenAI TTS (tts-1)", "voice_output", "Yes"),
        ("OPENAI_WHISPER", "OpenAI Whisper (whisper-1)", "voice_input", "Yes"),
    ]
    for i, r in enumerate(routes):
        pdf.table_row(r, w3, i % 2 == 0)
    pdf.ln(4)

    pdf.body(
        "Key architectural note: DEEPSEEK is marked `backgroundJobsOnly: true` and `isUserFacing: false`. "
        "It never directly serves user requests -- only internal jobs like summarization and pattern analysis. "
        "Model secrets are loaded at runtime from Deno.env with support for aliases like OPENAI_API_BASE_URL "
        "and OPENAI_2_API_BASE_URL."
    )

    # ===============================================
    # 10. FRONTEND XP
    # ===============================================
    pdf.add_page()
    pdf.chapter("10. Frontend XP Integration")

    pdf.subchapter("10.1 Profile Page (Profile.tsx)")
    pdf.body(
        "The Profile page fetches `earned`, `purchased`, `rollover` from `user_xp` via Supabase client. "
        "Displays a breakdown card with individual pool balances and a total. "
        "Also shows the assertiveness slider (1-5) from the `users` table, with live save on change."
    )

    pdf.subchapter("10.2 Home Page (Home.tsx)")
    pdf.body(
        "Fetches the full user_xp row (earned, purchased, rollover, reserved_xp). "
        "Computes level as floor(earned / 100) -- every 100 earned XP = 1 level. "
        "Displays `earnedXP` and `totalXP` in the LevelHero component. "
        "Also fetches streak data (current_count, last_activity_date) and derives Mon-Sun weekly "
        "activity booleans for display."
    )

    pdf.subchapter("10.3 Settings Page (Settings.tsx)")
    pdf.body(
        "Contains an 'XP & Gamification' menu item (currently non-functional placeholder). "
        "Theme switcher with Crimson, Arctic, and Gold variants, each with custom CSS variables "
        "for glass panels, dock, accent colors, and glossy pill effects."
    )

    pdf.subchapter("10.4 XP Estimation for Priority Tasks")
    pdf.body(
        "The Home page estimates task XP rewards heuristically because the tasks table has no "
        "`xp_reward` column. The heuristic: description > 200 chars = 150 XP, > 100 chars = 100 XP, "
        "else 50 XP. This is a client-side approximation; actual XP is awarded by the billing-manager "
        "'earn' action on task completion."
    )

    # ===============================================
    # 11. PERFORMANCE METRICS
    # ===============================================
    pdf.add_page()
    pdf.chapter("11. Performance Metrics & Community XP Sync")

    pdf.subchapter("11.1 compute_user_performance_metrics(p_user_id)")
    pdf.body(
        "A STABLE SQL function that computes four metrics from the user's data:\n"
        "- completion_percentage: completed / total tasks * 100\n"
        "- weekly_task_completion_rate: completed / total (last 7 days) * 100\n"
        "- consistency_rating: current_streak / longest_streak * 100 (capped at 100)\n"
        "- momentum_score: (completion * 0.4) + (weekly * 0.3) + (consistency * 0.3)\n\n"
        "Weighted composite: 40% overall completion, 30% recency, 30% streak consistency."
    )

    pdf.subchapter("11.2 Automatic Refresh Triggers")
    pdf.body(
        "Three triggers auto-refresh community post metrics whenever tasks, streaks, or performance "
        "change: tasks_refresh_community_metrics, user_streaks_refresh_community_metrics, "
        "user_performance_refresh_community_metrics. These cascade `refresh_user_performance()` -> "
        "`refresh_community_post_metrics()` which updates all community_posts rows for that user "
        "with the latest metrics."
    )

    # ===============================================
    # 12. END-TO-END XP LIFECYCLE
    # ===============================================
    pdf.add_page()
    pdf.chapter("12. End-to-End XP Lifecycle (Walkthrough)")

    pdf.body("Step-by-step trace of a typical user interaction:")
    pdf.bullet("1. User signs up -> handle_new_user() trigger creates users row + user_xp row + user_performance row")
    pdf.bullet("2. User completes onboarding -> users.onboarding_complete = true")
    pdf.bullet("3. User requests mentor message -> frontend calls billing-manager?action=preflight")
    pdf.bullet("4. billing-manager checks tier, computes estimate (mentor_message = 5 XP), calls reserve_xp() RPC")
    pdf.bullet("5. reserve_xp() row-locks user_xp, checks available >= 5, increments reserved_xp by 5, logs transaction")
    pdf.bullet("6. billing-manager returns {allowed: true, reservedAmount: 5}")
    pdf.bullet("7. Frontend sends message to model-router edge function, which routes to MENTOR provider (DeepSeek V4 Pro)")
    pdf.bullet("8. AI responds with N tokens")
    pdf.bullet("9. Frontend calls billing-manager?action=finalize with totalTokens=N and reservedAmount=5")
    pdf.bullet("10. billing-manager computes actualXp = ceil(N/2000), releases reservation, deducts actualXp")
    pdf.bullet("11. deduct_xp() waterfall: rollover -> purchased -> earned. Logs with balances.")
    pdf.bullet("12. User completes a task -> billing-manager?action=earn is called")
    pdf.bullet("13. earn action looks up tier multiplier, computes xpEarned = base * multiplier, credits earned pool")
    pdf.bullet("14. At month-end, process_monthly_xp_rollover() runs: tier-dependent rollover of earned XP")

    pdf.ln(3)
    pdf.body(
        "If step 8 fails (AI error): frontend calls billing-manager?action=cancel -> release_xp_reservation() -> "
        "XP returned to available pool. If cancel itself fails: reservation written to dead_letter_reservations."
    )

    # ===============================================
    # 13. KEY ARCHITECTURAL DECISIONS
    # ===============================================
    pdf.add_page()
    pdf.chapter("13. Key Architectural Decisions & Trade-offs")

    pdf.bullet("Dual-write reservation pattern (preflight -> finalize/cancel): Prevents double-spending in distributed AI calls. Trade-off: adds latency (extra round-trip) and requires cleanup for abandoned reservations (15-min TTL).")
    pdf.bullet("SECURITY DEFINER RPCs: All XP mutations run with elevated DB privileges. Trade-off: bypasses RLS, so any edge function with the service_role key can mutate XP -- trust boundary is the edge function, not the database.")
    pdf.bullet("Immutable transaction log with balance snapshots: Every XP change records before/after balances. Enables full audit trail, reconciliation, analytics. Trade-off: more storage, more complex queries.")
    pdf.bullet("Idempotency keys on transactions: Prevents double-charging from retries. UNIQUE constraint on (user_id, idempotency_key). Trade-off: callers must generate unique keys per operation.")
    pdf.bullet("Tier enum in PostgreSQL: Tiers are database-level, not config-file. Makes them queryable in SQL functions (get_rollover_percentage, get_storage_limit_bytes). Trade-off: adding a tier requires migration.")
    pdf.bullet("Estimated vs actual XP: preflight uses ESTIMATED_XP_COST constants; finalize uses ceil(tokens/2000). Trade-off: estimates can diverge from actuals (depends on model verbosity), but simplifies preflight without knowing token count upfront.")
    pdf.bullet("Deduction waterfall (rollover -> purchased -> earned): Rollover expires if unused, so it's consumed first. Purchased is real money, so it's consumed second. Earned (free) is consumed last.")
    pdf.bullet("JavaScript-side deductFromPools() mirrors SQL deduct_xp(): Duplicate implementation in billing-manager edge function and PostgreSQL RPC. Risk of divergence. The SQL RPC is authoritative (SECURITY DEFINER, row-locked), the JS version appears to be legacy.")
    pdf.bullet("Dead letter queue: Provides safety net for failed cancellations. Currently manual resolution only -- no automated reconciliation process implemented.")
    pdf.bullet("Monthly rollover as PostgreSQL function: Processed in-database rather than in edge function. Benefits from atomic batch operations and idempotency via composite key. Must be triggered by an external cron scheduler (pg_cron or external).")

    # -- Footer note --
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 5, "Report generated from kin workspace -- supabase/functions/ + supabase/migrations/ + opus-devia/src/")
    pdf.ln(5)
    pdf.cell(0, 5, "All code references are to files as they existed at generation time.")

    # -- Save --
    out_path = "c:/kin/Opus_Devia_Tiers_XP_Billing_Report.pdf"
    pdf.output(out_path)
    print(f"PDF saved to: {out_path}")
    return out_path


if __name__ == "__main__":
    build()

-- =============================================================================
-- Opus Devia — Production Database Schema
-- Single executable migration: tables, constraints, indexes, RLS, triggers, RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.user_tier AS ENUM ('free', 'builder', 'operator', 'founder');
CREATE TYPE public.roadmap_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE public.session_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE public.session_type AS ENUM ('mentor', 'assistant', 'mixed');
CREATE TYPE public.proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE public.community_visibility AS ENUM ('public', 'limited', 'private');
CREATE TYPE public.xp_transaction_type AS ENUM (
  'earn', 'purchase', 'deduct', 'reserve', 'release', 'rollover_transfer', 'refund'
);
CREATE TYPE public.memory_event_type AS ENUM (
  'streak_broken', 'discipline_collapse', 'phase_completed', 'roadmap_shift',
  'milestone_reached', 'custom'
);
CREATE TYPE public.community_interaction_type AS ENUM ('like', 'comment', 'encourage');

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tier helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_storage_limit_bytes(p_tier public.user_tier)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'free' THEN 52428800::bigint          -- 50 MB
    WHEN 'builder' THEN 524288000::bigint      -- 500 MB
    WHEN 'operator' THEN 2147483648::bigint    -- 2 GB
    WHEN 'founder' THEN 10737418240::bigint    -- 10 GB
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_rollover_percentage(p_tier public.user_tier)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'free' THEN 0
    WHEN 'builder' THEN 0.25
    WHEN 'operator' THEN 0.50
    WHEN 'founder' THEN 1.00
  END;
$$;

-- ---------------------------------------------------------------------------
-- Table: users
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  tier public.user_tier NOT NULL DEFAULT 'free',
  onboarding_complete boolean NOT NULL DEFAULT false,
  assertiveness_level integer NOT NULL DEFAULT 3,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_assertiveness_level_range CHECK (assertiveness_level BETWEEN 1 AND 5)
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: user_xp
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_xp (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  earned bigint NOT NULL DEFAULT 0,
  purchased bigint NOT NULL DEFAULT 0,
  rollover bigint NOT NULL DEFAULT 0,
  reserved_xp bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_xp_earned_non_negative CHECK (earned >= 0),
  CONSTRAINT user_xp_purchased_non_negative CHECK (purchased >= 0),
  CONSTRAINT user_xp_rollover_non_negative CHECK (rollover >= 0),
  CONSTRAINT user_xp_reserved_non_negative CHECK (reserved_xp >= 0),
  CONSTRAINT user_xp_reserved_within_total CHECK (
    reserved_xp <= earned + purchased + rollover
  )
);

CREATE TRIGGER user_xp_set_updated_at
  BEFORE UPDATE ON public.user_xp
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: xp_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE public.xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  transaction_type public.xp_transaction_type NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  delta_rollover bigint NOT NULL DEFAULT 0,
  delta_purchased bigint NOT NULL DEFAULT 0,
  delta_earned bigint NOT NULL DEFAULT 0,
  delta_reserved bigint NOT NULL DEFAULT 0,
  balance_rollover bigint NOT NULL,
  balance_purchased bigint NOT NULL,
  balance_earned bigint NOT NULL,
  balance_reserved bigint NOT NULL,
  reference_type text,
  reference_id uuid,
  idempotency_key text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT xp_transactions_idempotency_unique UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_xp_transactions_user_id_created_at
  ON public.xp_transactions (user_id, created_at DESC);

CREATE INDEX idx_xp_transactions_reference
  ON public.xp_transactions (reference_type, reference_id);

-- ---------------------------------------------------------------------------
-- Table: sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  session_type public.session_type NOT NULL DEFAULT 'mixed',
  status public.session_status NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  assistant_shelf jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON public.sessions (user_id);
CREATE INDEX idx_sessions_user_status ON public.sessions (user_id, status);

CREATE TRIGGER sessions_set_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: roadmaps
-- ---------------------------------------------------------------------------
CREATE TABLE public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.roadmap_status NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  reconfiguration_eligible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roadmaps_deleted_status_consistency CHECK (
    (status = 'deleted' AND deleted_at IS NOT NULL)
    OR (status <> 'deleted')
  )
);

CREATE UNIQUE INDEX idx_roadmaps_one_active_per_user
  ON public.roadmaps (user_id)
  WHERE status = 'active';

CREATE INDEX idx_roadmaps_user_id ON public.roadmaps (user_id);

CREATE TRIGGER roadmaps_set_updated_at
  BEFORE UPDATE ON public.roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Set reconfiguration_eligible_at when roadmap is deleted
CREATE OR REPLACE FUNCTION public.set_roadmap_reconfiguration_eligible_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'deleted' AND NEW.deleted_at IS NOT NULL THEN
    NEW.reconfiguration_eligible_at := NEW.deleted_at + interval '30 days';
  ELSIF NEW.status <> 'deleted' THEN
    NEW.reconfiguration_eligible_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER roadmaps_set_reconfiguration_eligible_at
  BEFORE INSERT OR UPDATE ON public.roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.set_roadmap_reconfiguration_eligible_at();

-- ---------------------------------------------------------------------------
-- Table: roadmap_phases
-- ---------------------------------------------------------------------------
CREATE TABLE public.roadmap_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  phase_order integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roadmap_phases_roadmap_id ON public.roadmap_phases (roadmap_id);
CREATE INDEX idx_roadmap_phases_user_id ON public.roadmap_phases (user_id);

CREATE TRIGGER roadmap_phases_set_updated_at
  BEFORE UPDATE ON public.roadmap_phases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: tasks
-- ---------------------------------------------------------------------------
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_phase_id uuid NOT NULL REFERENCES public.roadmap_phases (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_roadmap_phase_id ON public.tasks (roadmap_phase_id);
CREATE INDEX idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX idx_tasks_user_completed ON public.tasks (user_id, is_completed);

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: roadmap_change_proposals
-- ---------------------------------------------------------------------------
CREATE TABLE public.roadmap_change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps (id) ON DELETE CASCADE,
  change_type text NOT NULL,
  reasoning text NOT NULL,
  current_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.proposal_status NOT NULL DEFAULT 'pending',
  session_id uuid REFERENCES public.sessions (id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roadmap_change_proposals_user_id
  ON public.roadmap_change_proposals (user_id);
CREATE INDEX idx_roadmap_change_proposals_roadmap_id
  ON public.roadmap_change_proposals (roadmap_id);
CREATE INDEX idx_roadmap_change_proposals_status
  ON public.roadmap_change_proposals (user_id, status);

CREATE TRIGGER roadmap_change_proposals_set_updated_at
  BEFORE UPDATE ON public.roadmap_change_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: user_streaks
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  streak_type text NOT NULL DEFAULT 'daily',
  current_count integer NOT NULL DEFAULT 0,
  longest_count integer NOT NULL DEFAULT 0,
  last_activity_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_streaks_counts_non_negative CHECK (
    current_count >= 0 AND longest_count >= 0
  )
);

CREATE UNIQUE INDEX idx_user_streaks_user_type
  ON public.user_streaks (user_id, streak_type);

CREATE INDEX idx_user_streaks_user_id ON public.user_streaks (user_id);

CREATE TRIGGER user_streaks_set_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: user_performance
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  completion_percentage numeric(5,2) NOT NULL DEFAULT 0,
  weekly_task_completion_rate numeric(5,2) NOT NULL DEFAULT 0,
  consistency_rating numeric(5,2) NOT NULL DEFAULT 0,
  momentum_score numeric(5,2) NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_performance_metrics_range CHECK (
    completion_percentage BETWEEN 0 AND 100
    AND weekly_task_completion_rate BETWEEN 0 AND 100
    AND consistency_rating BETWEEN 0 AND 100
    AND momentum_score BETWEEN 0 AND 100
  )
);

CREATE UNIQUE INDEX idx_user_performance_user_id ON public.user_performance (user_id);

CREATE TRIGGER user_performance_set_updated_at
  BEFORE UPDATE ON public.user_performance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: journal_entries
-- ---------------------------------------------------------------------------
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  assistant_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entries_locked_blocks_assistant CHECK (
    NOT (is_locked AND assistant_access)
  )
);

CREATE INDEX idx_journal_entries_user_id ON public.journal_entries (user_id);

CREATE TRIGGER journal_entries_set_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Memory tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.memory_live_window (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  message_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_live_window_session_id
  ON public.memory_live_window (session_id, message_order);

CREATE TABLE public.memory_session_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  token_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memory_session_summary_one_per_session UNIQUE (session_id)
);

CREATE INDEX idx_memory_session_summary_user_id
  ON public.memory_session_summary (user_id);

CREATE TRIGGER memory_session_summary_set_updated_at
  BEFORE UPDATE ON public.memory_session_summary
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.memory_persistent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  memory_key text NOT NULL,
  memory_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  importance integer NOT NULL DEFAULT 1,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_memory_persistent_user_key
  ON public.memory_persistent (user_id, memory_key);

CREATE INDEX idx_memory_persistent_user_id ON public.memory_persistent (user_id);

CREATE TRIGGER memory_persistent_set_updated_at
  BEFORE UPDATE ON public.memory_persistent
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions (id) ON DELETE SET NULL,
  event_type public.memory_event_type NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_events_user_id ON public.memory_events (user_id);
CREATE INDEX idx_memory_events_event_type ON public.memory_events (user_id, event_type);

CREATE TABLE public.memory_cached_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions (id) ON DELETE SET NULL,
  analysis_type text NOT NULL,
  analysis_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_cached_analysis_user_valid
  ON public.memory_cached_analysis (user_id, analysis_type)
  WHERE invalidated_at IS NULL;

CREATE TABLE public.memory_session_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  archive_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memory_session_archive_one_per_session UNIQUE (session_id)
);

CREATE INDEX idx_memory_session_archive_user_id
  ON public.memory_session_archive (user_id);

-- ---------------------------------------------------------------------------
-- Table: community_posts
-- ---------------------------------------------------------------------------
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  content text NOT NULL,
  visibility public.community_visibility NOT NULL DEFAULT 'private',
  completion_percentage numeric(5,2) NOT NULL DEFAULT 0,
  weekly_task_completion_rate numeric(5,2) NOT NULL DEFAULT 0,
  consistency_rating numeric(5,2) NOT NULL DEFAULT 0,
  momentum_score numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_posts_user_id ON public.community_posts (user_id);
CREATE INDEX idx_community_posts_visibility ON public.community_posts (visibility);

CREATE TRIGGER community_posts_set_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: community_interactions
-- ---------------------------------------------------------------------------
CREATE TABLE public.community_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  interaction_type public.community_interaction_type NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_interactions_post_id
  ON public.community_interactions (post_id);
CREATE INDEX idx_community_interactions_user_id
  ON public.community_interactions (user_id);

-- ---------------------------------------------------------------------------
-- Table: user_storage
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  object_key text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_storage_size_positive CHECK (size_bytes > 0)
);

CREATE INDEX idx_user_storage_user_id ON public.user_storage (user_id);

CREATE TRIGGER user_storage_set_updated_at
  BEFORE UPDATE ON public.user_storage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: onboarding_responses
-- ---------------------------------------------------------------------------
CREATE TABLE public.onboarding_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  question_key text NOT NULL,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_onboarding_responses_user_question
  ON public.onboarding_responses (user_id, question_key);

CREATE INDEX idx_onboarding_responses_user_id
  ON public.onboarding_responses (user_id);

CREATE TRIGGER onboarding_responses_set_updated_at
  BEFORE UPDATE ON public.onboarding_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

-- Auth bootstrap: create users + user_xp on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name')
  );
  INSERT INTO public.user_xp (user_id, earned)
  VALUES (NEW.id, 120);
  INSERT INTO public.user_performance (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Journal: locked entries cannot grant assistant access
CREATE OR REPLACE FUNCTION public.enforce_journal_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_locked THEN
    NEW.assistant_access := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entries_enforce_lock
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_journal_lock();

-- Roadmap: 30-day reconfiguration delay
CREATE OR REPLACE FUNCTION public.enforce_roadmap_reconfiguration_delay()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_blocked_until timestamptz;
BEGIN
  SELECT r.reconfiguration_eligible_at INTO v_blocked_until
  FROM public.roadmaps r
  WHERE r.user_id = NEW.user_id
    AND r.deleted_at IS NOT NULL
    AND r.reconfiguration_eligible_at > now()
  ORDER BY r.reconfiguration_eligible_at DESC
  LIMIT 1;

  IF v_blocked_until IS NOT NULL THEN
    RAISE EXCEPTION
      'Roadmap reconfiguration locked until % (30-day delay after deletion)',
      v_blocked_until
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER roadmaps_enforce_reconfiguration_delay
  BEFORE INSERT ON public.roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.enforce_roadmap_reconfiguration_delay();

-- Memory cache invalidation
CREATE OR REPLACE FUNCTION public.invalidate_cached_analysis_on_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_type IN (
    'streak_broken', 'discipline_collapse', 'phase_completed', 'roadmap_shift'
  ) THEN
    UPDATE public.memory_cached_analysis
    SET invalidated_at = now()
    WHERE user_id = NEW.user_id
      AND invalidated_at IS NULL
      AND (
        session_id IS NULL
        OR NEW.session_id IS NULL
        OR session_id = NEW.session_id
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER memory_events_invalidate_cache
  AFTER INSERT ON public.memory_events
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_cached_analysis_on_event();

-- Storage tier enforcement
CREATE OR REPLACE FUNCTION public.enforce_storage_tier_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier public.user_tier;
  v_limit bigint;
  v_current_total bigint;
  v_new_total bigint;
  v_old_size bigint := 0;
BEGIN
  SELECT tier INTO v_tier FROM public.users WHERE id = NEW.user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found for storage enforcement';
  END IF;

  v_limit := public.get_storage_limit_bytes(v_tier);

  IF TG_OP = 'UPDATE' THEN
    v_old_size := OLD.size_bytes;
  END IF;

  SELECT COALESCE(SUM(size_bytes), 0) INTO v_current_total
  FROM public.user_storage
  WHERE user_id = NEW.user_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_new_total := v_current_total - v_old_size + NEW.size_bytes;

  IF v_new_total > v_limit THEN
    RAISE EXCEPTION
      'Storage limit exceeded for tier %. Used % bytes, limit % bytes',
      v_tier, v_new_total, v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER user_storage_enforce_limit_insert
  BEFORE INSERT ON public.user_storage
  FOR EACH ROW EXECUTE FUNCTION public.enforce_storage_tier_limit();

CREATE TRIGGER user_storage_enforce_limit_update
  BEFORE UPDATE OF size_bytes ON public.user_storage
  FOR EACH ROW EXECUTE FUNCTION public.enforce_storage_tier_limit();

-- Performance metrics computation
CREATE OR REPLACE FUNCTION public.compute_user_performance_metrics(p_user_id uuid)
RETURNS TABLE (
  completion_percentage numeric,
  weekly_task_completion_rate numeric,
  consistency_rating numeric,
  momentum_score numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_tasks integer;
  v_completed_tasks integer;
  v_weekly_total integer;
  v_weekly_completed integer;
  v_streak_current integer;
  v_streak_longest integer;
  v_completion numeric;
  v_weekly numeric;
  v_consistency numeric;
  v_momentum numeric;
BEGIN
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE is_completed)::integer
  INTO v_total_tasks, v_completed_tasks
  FROM public.tasks
  WHERE user_id = p_user_id;

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE is_completed)::integer
  INTO v_weekly_total, v_weekly_completed
  FROM public.tasks
  WHERE user_id = p_user_id
    AND created_at >= now() - interval '7 days';

  SELECT COALESCE(current_count, 0), COALESCE(longest_count, 0)
  INTO v_streak_current, v_streak_longest
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = 'daily'
  LIMIT 1;

  v_completion := CASE
    WHEN v_total_tasks = 0 THEN 0
    ELSE ROUND((v_completed_tasks::numeric / v_total_tasks) * 100, 2)
  END;

  v_weekly := CASE
    WHEN v_weekly_total = 0 THEN 0
    ELSE ROUND((v_weekly_completed::numeric / v_weekly_total) * 100, 2)
  END;

  v_consistency := CASE
    WHEN v_streak_longest = 0 THEN 0
    ELSE ROUND(LEAST((v_streak_current::numeric / v_streak_longest) * 100, 100), 2)
  END;

  v_momentum := ROUND((v_completion * 0.4) + (v_weekly * 0.3) + (v_consistency * 0.3), 2);

  completion_percentage := v_completion;
  weekly_task_completion_rate := v_weekly;
  consistency_rating := v_consistency;
  momentum_score := v_momentum;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_user_performance(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_metrics record;
BEGIN
  SELECT * INTO v_metrics
  FROM public.compute_user_performance_metrics(p_user_id);

  UPDATE public.user_performance
  SET
    completion_percentage = v_metrics.completion_percentage,
    weekly_task_completion_rate = v_metrics.weekly_task_completion_rate,
    consistency_rating = v_metrics.consistency_rating,
    momentum_score = v_metrics.momentum_score,
    computed_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_performance (
      user_id,
      completion_percentage,
      weekly_task_completion_rate,
      consistency_rating,
      momentum_score
    ) VALUES (
      p_user_id,
      v_metrics.completion_percentage,
      v_metrics.weekly_task_completion_rate,
      v_metrics.consistency_rating,
      v_metrics.momentum_score
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_community_post_metrics(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_metrics record;
BEGIN
  PERFORM public.refresh_user_performance(p_user_id);

  SELECT
    completion_percentage,
    weekly_task_completion_rate,
    consistency_rating,
    momentum_score
  INTO v_metrics
  FROM public.user_performance
  WHERE user_id = p_user_id;

  UPDATE public.community_posts
  SET
    completion_percentage = v_metrics.completion_percentage,
    weekly_task_completion_rate = v_metrics.weekly_task_completion_rate,
    consistency_rating = v_metrics.consistency_rating,
    momentum_score = v_metrics.momentum_score
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_community_metrics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  PERFORM public.refresh_community_post_metrics(v_user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tasks_refresh_community_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_community_metrics();

CREATE TRIGGER user_streaks_refresh_community_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_community_metrics();

CREATE TRIGGER user_performance_refresh_community_metrics
  AFTER INSERT OR UPDATE ON public.user_performance
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_community_metrics();

-- Onboarding gate helper
CREATE OR REPLACE FUNCTION public.user_onboarding_complete(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT onboarding_complete FROM public.users WHERE id = p_user_id),
    false
  );
$$;

-- =============================================================================
-- RPC FUNCTIONS — XP economy (atomic, SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_xp_transaction(
  p_user_id uuid,
  p_transaction_type public.xp_transaction_type,
  p_amount bigint,
  p_delta_rollover bigint,
  p_delta_purchased bigint,
  p_delta_earned bigint,
  p_delta_reserved bigint,
  p_balance_rollover bigint,
  p_balance_purchased bigint,
  p_balance_earned bigint,
  p_balance_reserved bigint,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_tx_id
    FROM public.xp_transactions
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_tx_id;
    END IF;
  END IF;

  INSERT INTO public.xp_transactions (
    user_id, transaction_type, amount,
    delta_rollover, delta_purchased, delta_earned, delta_reserved,
    balance_rollover, balance_purchased, balance_earned, balance_reserved,
    reference_type, reference_id, idempotency_key, description, metadata
  ) VALUES (
    p_user_id, p_transaction_type, p_amount,
    p_delta_rollover, p_delta_purchased, p_delta_earned, p_delta_reserved,
    p_balance_rollover, p_balance_purchased, p_balance_earned, p_balance_reserved,
    p_reference_type, p_reference_id, p_idempotency_key, p_description, p_metadata
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_xp(
  p_user_id uuid,
  p_amount bigint,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp public.user_xp%ROWTYPE;
  v_available bigint;
  v_tx_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Reservation amount must be positive';
  END IF;

  SELECT * INTO v_xp
  FROM public.user_xp
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'XP record not found for user %', p_user_id;
  END IF;

  v_available := v_xp.rollover + v_xp.purchased + v_xp.earned - v_xp.reserved_xp;
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient available XP. Available: %, Requested: %', v_available, p_amount;
  END IF;

  UPDATE public.user_xp
  SET reserved_xp = reserved_xp + p_amount
  WHERE user_id = p_user_id
  RETURNING * INTO v_xp;

  v_tx_id := public.log_xp_transaction(
    p_user_id, 'reserve', p_amount,
    0, 0, 0, p_amount,
    v_xp.rollover, v_xp.purchased, v_xp.earned, v_xp.reserved_xp,
    p_reference_type, p_reference_id, p_idempotency_key, p_description, p_metadata
  );

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_xp_reservation(
  p_user_id uuid,
  p_amount bigint,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp public.user_xp%ROWTYPE;
  v_tx_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Release amount must be positive';
  END IF;

  SELECT * INTO v_xp
  FROM public.user_xp
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'XP record not found for user %', p_user_id;
  END IF;

  IF v_xp.reserved_xp < p_amount THEN
    RAISE EXCEPTION 'Cannot release more than reserved XP';
  END IF;

  UPDATE public.user_xp
  SET reserved_xp = reserved_xp - p_amount
  WHERE user_id = p_user_id
  RETURNING * INTO v_xp;

  v_tx_id := public.log_xp_transaction(
    p_user_id, 'release', p_amount,
    0, 0, 0, -p_amount,
    v_xp.rollover, v_xp.purchased, v_xp.earned, v_xp.reserved_xp,
    p_reference_type, p_reference_id, p_idempotency_key, p_description, p_metadata
  );

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_xp(
  p_user_id uuid,
  p_amount bigint,
  p_from_reservation boolean DEFAULT false,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp public.user_xp%ROWTYPE;
  v_remaining bigint;
  v_take bigint;
  v_delta_rollover bigint := 0;
  v_delta_purchased bigint := 0;
  v_delta_earned bigint := 0;
  v_delta_reserved bigint := 0;
  v_available bigint;
  v_tx_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Deduction amount must be positive';
  END IF;

  SELECT * INTO v_xp
  FROM public.user_xp
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'XP record not found for user %', p_user_id;
  END IF;

  IF p_from_reservation THEN
    IF v_xp.reserved_xp < p_amount THEN
      RAISE EXCEPTION 'Insufficient reserved XP for deduction';
    END IF;
    v_delta_reserved := -p_amount;
  ELSE
    v_available := v_xp.rollover + v_xp.purchased + v_xp.earned - v_xp.reserved_xp;
    IF v_available < p_amount THEN
      RAISE EXCEPTION 'Insufficient available XP for deduction';
    END IF;
  END IF;

  v_remaining := p_amount;

  -- Deduction order: rollover -> purchased -> earned
  IF v_xp.rollover > 0 AND v_remaining > 0 THEN
    v_take := LEAST(v_xp.rollover, v_remaining);
    v_delta_rollover := -v_take;
    v_remaining := v_remaining - v_take;
  END IF;

  IF v_xp.purchased > 0 AND v_remaining > 0 THEN
    v_take := LEAST(v_xp.purchased, v_remaining);
    v_delta_purchased := -v_take;
    v_remaining := v_remaining - v_take;
  END IF;

  IF v_xp.earned > 0 AND v_remaining > 0 THEN
    v_take := LEAST(v_xp.earned, v_remaining);
    v_delta_earned := -v_take;
    v_remaining := v_remaining - v_take;
  END IF;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'XP deduction failed — pool exhaustion after allocation';
  END IF;

  UPDATE public.user_xp
  SET
    rollover = rollover + v_delta_rollover,
    purchased = purchased + v_delta_purchased,
    earned = earned + v_delta_earned,
    reserved_xp = reserved_xp + v_delta_reserved
  WHERE user_id = p_user_id
  RETURNING * INTO v_xp;

  v_tx_id := public.log_xp_transaction(
    p_user_id, 'deduct', p_amount,
    v_delta_rollover, v_delta_purchased, v_delta_earned, v_delta_reserved,
    v_xp.rollover, v_xp.purchased, v_xp.earned, v_xp.reserved_xp,
    p_reference_type, p_reference_id, p_idempotency_key, p_description, p_metadata
  );

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_xp(
  p_user_id uuid,
  p_amount bigint,
  p_pool text DEFAULT 'earned',
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp public.user_xp%ROWTYPE;
  v_delta_rollover bigint := 0;
  v_delta_purchased bigint := 0;
  v_delta_earned bigint := 0;
  v_tx_type public.xp_transaction_type;
  v_tx_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  SELECT * INTO v_xp
  FROM public.user_xp
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'XP record not found for user %', p_user_id;
  END IF;

  CASE p_pool
    WHEN 'rollover' THEN
      v_delta_rollover := p_amount;
      v_tx_type := 'rollover_transfer';
    WHEN 'purchased' THEN
      v_delta_purchased := p_amount;
      v_tx_type := 'purchase';
    WHEN 'earned' THEN
      v_delta_earned := p_amount;
      v_tx_type := 'earn';
    ELSE RAISE EXCEPTION 'Invalid XP pool: %', p_pool;
  END CASE;

  UPDATE public.user_xp
  SET
    rollover = rollover + v_delta_rollover,
    purchased = purchased + v_delta_purchased,
    earned = earned + v_delta_earned
  WHERE user_id = p_user_id
  RETURNING * INTO v_xp;

  v_tx_id := public.log_xp_transaction(
    p_user_id, v_tx_type, p_amount,
    v_delta_rollover, v_delta_purchased, v_delta_earned, 0,
    v_xp.rollover, v_xp.purchased, v_xp.earned, v_xp.reserved_xp,
    p_reference_type, p_reference_id, p_idempotency_key, p_description, p_metadata
  );

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_monthly_xp_rollover()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_pct numeric;
  v_transfer bigint;
  v_forfeit bigint;
  v_count integer := 0;
  v_tx_id uuid;
BEGIN
  FOR v_row IN
    SELECT ux.user_id, ux.earned, u.tier
    FROM public.user_xp ux
    JOIN public.users u ON u.id = ux.user_id
    WHERE ux.earned > 0
  LOOP
    v_pct := public.get_rollover_percentage(v_row.tier);
    IF v_pct <= 0 THEN
      -- Free tier: forfeit all unused earned XP
      IF v_row.earned > 0 THEN
        UPDATE public.user_xp
        SET earned = 0
        WHERE user_id = v_row.user_id;

        PERFORM public.log_xp_transaction(
          v_row.user_id, 'rollover_transfer', v_row.earned,
          0, 0, -v_row.earned, 0,
          (SELECT rollover FROM public.user_xp WHERE user_id = v_row.user_id),
          (SELECT purchased FROM public.user_xp WHERE user_id = v_row.user_id),
          0,
          (SELECT reserved_xp FROM public.user_xp WHERE user_id = v_row.user_id),
          'billing_cycle', NULL, 'rollover-' || v_row.user_id || '-' || to_char(now(), 'YYYY-MM'),
          'Monthly earned XP forfeited (free tier)', '{}'::jsonb
        );
        v_count := v_count + 1;
      END IF;
      CONTINUE;
    END IF;

    v_transfer := FLOOR(v_row.earned * v_pct);
    v_forfeit := v_row.earned - v_transfer;

    IF v_transfer > 0 OR v_forfeit > 0 THEN
      UPDATE public.user_xp
      SET
        rollover = rollover + v_transfer,
        earned = 0
      WHERE user_id = v_row.user_id;

      PERFORM public.log_xp_transaction(
        v_row.user_id, 'rollover_transfer', v_row.earned,
        v_transfer, 0, -v_row.earned, 0,
        (SELECT rollover FROM public.user_xp WHERE user_id = v_row.user_id),
        (SELECT purchased FROM public.user_xp WHERE user_id = v_row.user_id),
        0,
        (SELECT reserved_xp FROM public.user_xp WHERE user_id = v_row.user_id),
        'billing_cycle', NULL, 'rollover-' || v_row.user_id || '-' || to_char(now(), 'YYYY-MM'),
        format('Monthly rollover: %s XP transferred, %s XP forfeited', v_transfer, v_forfeit),
        jsonb_build_object('transfer', v_transfer, 'forfeit', v_forfeit, 'tier', v_row.tier)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Roadmap RPCs
CREATE OR REPLACE FUNCTION public.create_roadmap(
  p_title text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_roadmap_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_onboarding_complete(v_user_id) THEN
    RAISE EXCEPTION 'Onboarding must be completed before creating a roadmap';
  END IF;

  INSERT INTO public.roadmaps (user_id, title, description, status)
  VALUES (v_user_id, p_title, p_description, 'active')
  RETURNING id INTO v_roadmap_id;

  RETURN v_roadmap_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_roadmap(p_roadmap_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.roadmaps
  SET status = 'deleted', deleted_at = now()
  WHERE id = p_roadmap_id
    AND user_id = v_user_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active roadmap not found or not owned by user';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_roadmap_change_proposal(
  p_roadmap_id uuid,
  p_change_type text,
  p_reasoning text,
  p_current_state jsonb,
  p_proposed_state jsonb,
  p_session_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_proposal_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_onboarding_complete(v_user_id) THEN
    RAISE EXCEPTION 'Onboarding must be completed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.roadmaps
    WHERE id = p_roadmap_id AND user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active roadmap not found';
  END IF;

  INSERT INTO public.roadmap_change_proposals (
    user_id, roadmap_id, change_type, reasoning,
    current_state, proposed_state, session_id
  ) VALUES (
    v_user_id, p_roadmap_id, p_change_type, p_reasoning,
    p_current_state, p_proposed_state, p_session_id
  )
  RETURNING id INTO v_proposal_id;

  RETURN v_proposal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_roadmap_proposal(
  p_proposal_id uuid,
  p_accept boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_proposal public.roadmap_change_proposals%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_proposal
  FROM public.roadmap_change_proposals
  WHERE id = p_proposal_id AND user_id = v_user_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending proposal not found';
  END IF;

  IF p_accept THEN
    UPDATE public.roadmap_change_proposals
    SET status = 'accepted', confirmed_at = now()
    WHERE id = p_proposal_id;

    -- Application-level merge of proposed_state into roadmap structure
    -- is handled by Edge Function; DB records the audit trail only.
  ELSE
    UPDATE public.roadmap_change_proposals
    SET status = 'rejected', rejected_at = now()
    WHERE id = p_proposal_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_responses jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_responses)
  LOOP
    INSERT INTO public.onboarding_responses (user_id, question_key, response)
    VALUES (v_user_id, v_key, v_value)
    ON CONFLICT (user_id, question_key)
    DO UPDATE SET response = EXCLUDED.response, updated_at = now();
  END LOOP;

  UPDATE public.users
  SET onboarding_complete = true
  WHERE id = v_user_id;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_live_window ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_session_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_persistent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_cached_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_session_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_xp: read only for clients
CREATE POLICY user_xp_select_own ON public.user_xp
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- xp_transactions: read only
CREATE POLICY xp_transactions_select_own ON public.xp_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- sessions
CREATE POLICY sessions_all_own ON public.sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- roadmaps (onboarding gate)
CREATE POLICY roadmaps_select_own ON public.roadmaps
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.user_onboarding_complete());
CREATE POLICY roadmaps_insert_own ON public.roadmaps
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_onboarding_complete());
CREATE POLICY roadmaps_update_own ON public.roadmaps
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.user_onboarding_complete())
  WITH CHECK (user_id = auth.uid() AND public.user_onboarding_complete());

-- roadmap_phases (onboarding gate)
CREATE POLICY roadmap_phases_all_own ON public.roadmap_phases
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.user_onboarding_complete())
  WITH CHECK (user_id = auth.uid() AND public.user_onboarding_complete());

-- tasks (onboarding gate)
CREATE POLICY tasks_all_own ON public.tasks
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.user_onboarding_complete())
  WITH CHECK (user_id = auth.uid() AND public.user_onboarding_complete());

-- roadmap_change_proposals
CREATE POLICY roadmap_change_proposals_all_own ON public.roadmap_change_proposals
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.user_onboarding_complete())
  WITH CHECK (user_id = auth.uid() AND public.user_onboarding_complete());

-- user_streaks
CREATE POLICY user_streaks_all_own ON public.user_streaks
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_performance
CREATE POLICY user_performance_select_own ON public.user_performance
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- journal_entries
CREATE POLICY journal_entries_all_own ON public.journal_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- memory tables
CREATE POLICY memory_live_window_all_own ON public.memory_live_window
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY memory_session_summary_all_own ON public.memory_session_summary
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY memory_persistent_all_own ON public.memory_persistent
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY memory_events_all_own ON public.memory_events
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY memory_cached_analysis_all_own ON public.memory_cached_analysis
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY memory_session_archive_all_own ON public.memory_session_archive
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- community_posts: public readable by all authenticated; limited/private owner only
CREATE POLICY community_posts_select ON public.community_posts
  FOR SELECT TO authenticated
  USING (visibility = 'public' OR user_id = auth.uid());
CREATE POLICY community_posts_insert_own ON public.community_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY community_posts_update_own ON public.community_posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY community_posts_delete_own ON public.community_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- community_interactions
CREATE POLICY community_interactions_select ON public.community_interactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id
        AND (cp.visibility = 'public' OR cp.user_id = auth.uid())
    )
  );
CREATE POLICY community_interactions_insert ON public.community_interactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id
        AND (cp.visibility = 'public' OR cp.user_id = auth.uid())
    )
  );
CREATE POLICY community_interactions_delete_own ON public.community_interactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- user_storage
CREATE POLICY user_storage_all_own ON public.user_storage
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- onboarding_responses
CREATE POLICY onboarding_responses_all_own ON public.onboarding_responses
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Grant execute on RPCs to authenticated users
GRANT EXECUTE ON FUNCTION public.reserve_xp TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_xp_reservation TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_xp TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_xp TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_roadmap TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_roadmap TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_roadmap_change_proposal TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_roadmap_proposal TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_onboarding_complete TO authenticated;

-- Service role functions (scheduled jobs / Edge Functions)
GRANT EXECUTE ON FUNCTION public.process_monthly_xp_rollover TO service_role;
GRANT EXECUTE ON FUNCTION public.log_xp_transaction TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_user_performance TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_community_post_metrics TO service_role;

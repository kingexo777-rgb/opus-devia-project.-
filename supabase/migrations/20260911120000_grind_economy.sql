-- =============================================================================
-- Opus Devia — Grind Economy
-- Adds cycle-scoped earning caps, media quotas, cost accounting, and the
-- server-authoritative grind award RPC.
-- =============================================================================

ALTER TABLE public.user_xp
  ADD COLUMN IF NOT EXISTS monthly_earn_cap INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grind_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cycle_started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS cycle_ends_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.image_voice_quotas (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  images_used_this_month INTEGER DEFAULT 0,
  images_used_today INTEGER DEFAULT 0,
  images_today_date DATE DEFAULT CURRENT_DATE,
  voice_seconds_used_this_month INTEGER DEFAULT 0,
  cycle_started_at TIMESTAMPTZ DEFAULT NOW(),
  cycle_ends_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.image_voice_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner only" ON public.image_voice_quotas
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.infrastructure_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  request_id TEXT,
  cost_usd NUMERIC(12, 8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.infrastructure_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.infrastructure_costs
  FOR ALL USING (false);

CREATE OR REPLACE FUNCTION public.award_grind_xp(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(awarded INTEGER, new_monthly_earned INTEGER, locked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap INTEGER;
  v_earned INTEGER;
  v_remaining INTEGER;
  v_actual_award INTEGER;
BEGIN
  SELECT monthly_earn_cap, monthly_earned
  INTO v_cap, v_earned
  FROM public.user_xp
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_remaining := GREATEST(0, v_cap - v_earned);
  v_actual_award := LEAST(p_amount, v_remaining);

  IF v_actual_award > 0 THEN
    UPDATE public.user_xp
    SET
      earned = earned + v_actual_award,
      monthly_earned = monthly_earned + v_actual_award,
      grind_locked = (monthly_earned + v_actual_award >= monthly_earn_cap),
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN QUERY SELECT
    v_actual_award,
    v_earned + v_actual_award,
    (v_earned + v_actual_award >= v_cap);
END;
$$;

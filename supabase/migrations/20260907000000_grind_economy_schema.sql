-- ============================================================================
-- GRIND ECONOMY V2 SCHEMA MIGRATION
-- ============================================================================
-- This migration adds the complete schema for the Grind Economy rework:
-- 1. New grind tracking columns on user_xp table
-- 2. New image_voice_quotas table
-- 3. New infrastructure_costs table
-- 4. New award_grind_xp RPC for atomic cap enforcement

-- ============================================================================
-- 1. ALTER user_xp TABLE — ADD GRIND TRACKING COLUMNS
-- ============================================================================

ALTER TABLE public.user_xp
ADD COLUMN IF NOT EXISTS monthly_earn_cap INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS grind_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cycle_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS cycle_ends_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 2. CREATE image_voice_quotas TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.image_voice_quotas (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  images_used_this_month INTEGER DEFAULT 0,
  images_used_today INTEGER DEFAULT 0,
  images_today_date DATE DEFAULT CURRENT_DATE,
  voice_seconds_used_this_month INTEGER DEFAULT 0,
  cycle_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cycle_ends_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.image_voice_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner only" ON public.image_voice_quotas;
CREATE POLICY "owner only" ON public.image_voice_quotas
FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 3. CREATE infrastructure_costs TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.infrastructure_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  request_id TEXT,
  cost_usd NUMERIC(12, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.infrastructure_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON public.infrastructure_costs;
CREATE POLICY "service role only" ON public.infrastructure_costs
FOR ALL USING (false);

-- ============================================================================
-- 4. CREATE award_grind_xp RPC — ATOMIC CAP ENFORCEMENT
-- ============================================================================
-- This RPC is the critical server-side safeguard that prevents race conditions
-- when awarding grind XP. It uses row locking to ensure cap enforcement is
-- atomic across concurrent requests.

CREATE OR REPLACE FUNCTION public.award_grind_xp(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(awarded INTEGER, new_monthly_earned INTEGER, locked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cap INTEGER;
  v_earned INTEGER;
  v_remaining INTEGER;
  v_actual_award INTEGER;
BEGIN
  -- Row lock prevents concurrent requests from double-awarding
  SELECT monthly_earn_cap, monthly_earned
  INTO v_cap, v_earned
  FROM user_xp
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_remaining := GREATEST(0, v_cap - v_earned);
  v_actual_award := LEAST(p_amount, v_remaining);

  IF v_actual_award > 0 THEN
    UPDATE user_xp
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

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
-- - Added 5 new columns to user_xp for grind cap tracking and cycle management
-- - Created image_voice_quotas table with RLS enabled
-- - Created infrastructure_costs table (internal accounting, RLS disabled for service role)
-- - Created award_grind_xp RPC with atomic row locking for race-condition-safe cap enforcement

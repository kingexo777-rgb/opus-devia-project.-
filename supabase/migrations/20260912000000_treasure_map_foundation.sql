ALTER TABLE public.user_xp
  ADD COLUMN IF NOT EXISTS active_xp_multiplier NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS xp_multiplier_expires_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.feature_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  credits_remaining INTEGER NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.treasure_maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_position INTEGER NOT NULL DEFAULT 0,
  reward_layout JSONB NOT NULL,
  map_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.treasure_map_daily_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  map_id UUID REFERENCES treasure_maps(id) ON DELETE CASCADE,
  task_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  phase_theme TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  spaces_moved INTEGER,
  resolved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_date)
);

CREATE TABLE IF NOT EXISTS public.treasure_map_reward_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  map_id UUID REFERENCES treasure_maps(id) ON DELETE CASCADE,
  node_position INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.feature_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_map_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_map_reward_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feature_credits'
      AND policyname = 'owner only'
  ) THEN
    CREATE POLICY "owner only" ON public.feature_credits
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'treasure_maps'
      AND policyname = 'owner only'
  ) THEN
    CREATE POLICY "owner only" ON public.treasure_maps
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'treasure_map_daily_tasks'
      AND policyname = 'owner only'
  ) THEN
    CREATE POLICY "owner only" ON public.treasure_map_daily_tasks
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'treasure_map_reward_claims'
      AND policyname = 'owner only'
  ) THEN
    CREATE POLICY "owner only" ON public.treasure_map_reward_claims
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_map_per_user
  ON public.treasure_maps (user_id)
  WHERE is_active = TRUE;

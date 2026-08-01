-- Add xp_reward to tasks so task completion can award XP.
-- Existing tasks without a stored xp_reward will default to 50 XP.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 50;

UPDATE public.tasks
SET xp_reward = 50
WHERE xp_reward IS NULL;

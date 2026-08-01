-- Add difficulty_score (1-5) to tasks table
-- Used by roadmap generator and frontend for difficulty rating badges
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS difficulty_score integer
CHECK (difficulty_score >= 1 AND difficulty_score <= 5);

COMMENT ON COLUMN public.tasks.difficulty_score IS 'Difficulty rating 1-5: 1=Very Easy, 2=Easy, 3=Medium, 4=Hard, 5=Expert';

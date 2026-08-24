-- Fix ambiguous PostgREST relationship between roadmap_phases and tasks.
--
-- `tasks` had two foreign keys referencing `roadmap_phases(id)`:
--   1. tasks_phase_id_fkey         (column: phase_id)
--   2. tasks_roadmap_phase_id_fkey (column: roadmap_phase_id)
--
-- This caused an embedded `tasks(*)` select from `roadmap_phases` to fail with
-- PostgREST error PGRST201 ("more than one relationship was found").
--
-- The application only ever reads/writes `roadmap_phase_id` (the generator writes
-- this column, and all existing rows have NULL `phase_id`). So drop the redundant
-- constraint and column to remove the ambiguity.

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_phase_id_fkey;

ALTER TABLE public.tasks DROP COLUMN IF EXISTS phase_id;

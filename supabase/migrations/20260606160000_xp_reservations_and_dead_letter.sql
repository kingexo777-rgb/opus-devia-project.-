-- =============================================================================
-- Opus Devia — XP Reservations & Dead Letter Queue
-- Tracks in-flight reservations with TTL and stores failed cancellations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: xp_reservations
-- Tracks all in-flight reservations with automatic expiry after 15 minutes
-- ---------------------------------------------------------------------------
CREATE TABLE public.xp_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  feature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + INTERVAL '15 minutes'
);

CREATE INDEX idx_xp_reservations_user_id ON public.xp_reservations (user_id);
CREATE INDEX idx_xp_reservations_status_expires ON public.xp_reservations (status, expires_at);

-- ---------------------------------------------------------------------------
-- Table: dead_letter_reservations
-- Dead letter queue for failed cancellations that require manual resolution
-- ---------------------------------------------------------------------------
CREATE TABLE public.dead_letter_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_dead_letter_reservations_user_id ON public.dead_letter_reservations (user_id);
CREATE INDEX idx_dead_letter_reservations_status ON public.dead_letter_reservations (status);
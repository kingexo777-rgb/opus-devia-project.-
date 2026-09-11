/**
 * Animation timing constants for roadmap phase completion and unlocking.
 * Centralize all animation delays to make them easily adjustable.
 */

export const ANIMATION_TIMINGS = {
  // Phase completion animation
  COMPLETION_DRAW: 600,
  COMPLETION_FADE_IN: 500,
  COMPLETION_OVERLAY_FADE_OUT: 500,

  // Phase unlock animation
  UNLOCK_SHAKE: 400,
  UNLOCK_GLOW: 800,
  UNLOCK_GLOW_DELAY: 400,
  UNLOCK_TITLE_FADE: 300,
  UNLOCK_LOCK_DISSOLVE: 300,

  // Timing sequences
  UNLOCK_DELAY: 2200,
  NEXT_PHASE_DELAY: 2800,
  REFETCH_DELAY: 800,
  UNLOCK_ANIMATION_DURATION: 3000,
} as const;

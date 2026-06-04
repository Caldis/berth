/**
 * Shared motion tokens (GH-105). One source for transition timing across the
 * app so HeroUI (framer-motion) and bespoke CSS/Tailwind transitions feel
 * consistent. Durations are in seconds (framer-motion) with ms helpers for CSS.
 */
export const MOTION = {
  duration: { fast: 0.15, base: 0.2, slow: 0.3 },
  durationMs: { fast: 150, base: 200, slow: 300 },
  // cubic-bezier control points (Material "standard" / "emphasized")
  ease: {
    standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
    emphasized: [0.2, 0, 0, 1] as [number, number, number, number]
  }
} as const

/** Tailwind utility string for the default berth transition (colors+shadow+transform). */
export const TRANSITION = 'transition-[background-color,box-shadow,transform,border-color] duration-200 ease-out'

/** Framer-motion variants for a subtle fade+rise entry (cards/panels). */
export const fadeRise = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION.duration.base, ease: MOTION.ease.standard }
} as const

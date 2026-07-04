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

function cubicBezierCss(points: readonly [number, number, number, number]): string {
  return `cubic-bezier(${points.join(', ')})`
}

/**
 * CSS string forms of the MOTION.ease control points (GH-153) — for consumers that
 * take CSS easing strings instead of framer-motion arrays (e.g. dnd-kit dropAnimation).
 * Computed from MOTION.ease so the control points stay single-source.
 */
export const EASE_CSS = {
  standard: cubicBezierCss(MOTION.ease.standard),
  emphasized: cubicBezierCss(MOTION.ease.emphasized)
} as const

/**
 * Dashboard FLIP layout glide (GH-150 R2 手感调参, 用户已验收 — GH-153 仅 token 化,
 * 数值锁定不动)。用于 framer-motion `layout` transition。
 */
export const LAYOUT_GLIDE = {
  duration: 0.28,
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number]
} as const

/** Framer-motion variants for a subtle fade+rise entry (cards/panels). */
export const fadeRise = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION.duration.base, ease: MOTION.ease.standard }
} as const

/**
 * Shared HeroUI Accordion motionProps (GH-136). Aligns the Accordion's
 * framer-motion expand/collapse timing to the MOTION tokens so component-library
 * accordions (teams page, plugin cards) match the hand-rolled Collapsible's
 * cadence. HeroUI v2's default durations are not publicly documented; this
 * overrides them. If it regresses HeroUI's height-auto behavior, drop it and
 * accept the defaults (GH-136 02-SPEC fallback).
 */
export const ACCORDION_MOTION_PROPS = {
  variants: {
    enter: {
      y: 0,
      opacity: 1,
      height: 'auto',
      transition: {
        height: { type: 'spring', stiffness: 500, damping: 30, duration: MOTION.duration.base },
        opacity: { easings: 'ease', duration: MOTION.duration.base }
      }
    },
    exit: {
      y: -3,
      opacity: 0,
      height: 0,
      transition: {
        height: { easings: 'ease', duration: MOTION.duration.base },
        opacity: { easings: 'ease', duration: MOTION.duration.fast }
      }
    }
  }
} as const

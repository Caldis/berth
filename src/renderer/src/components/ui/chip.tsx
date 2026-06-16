import { Chip as HeroChip, type ChipProps } from '@heroui/react'

/**
 * Semantic tone → HeroUI color. Collapses berth's fragmented badge/pill zoo
 * (ScopeBadge zinc, CostSourceBadge emerald/sky/amber, ad-hoc local Badges,
 * filter pills) into one vocabulary (GH-105 AC6). Tones map to the theme's
 * semantic colors so they follow dark/light + accent switches automatically.
 *
 * NOTE: `primary` is intentionally NOT a tone. `flat + primary` (the Chip default
 * variant) renders `bg-primary/20` (a washed-out grey-blue slab) + blue text — the
 * "blue-on-grey" anti-pattern. Per GH-105 SPEC blue is reserved for CTAs/data, not
 * informational labels. Use `neutral` for quiet info, or success/warning/danger for
 * semantics. A solid CTA still uses HeroUI `<Button color="primary">` directly.
 */
export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger'

const TONE_TO_COLOR: Record<ChipTone, ChipProps['color']> = {
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'danger'
}

export interface ChipUIProps extends Omit<ChipProps, 'color'> {
  /** Semantic tone; defaults to neutral. */
  tone?: ChipTone
}

/**
 * berth's standard chip. Defaults to a small flat chip — the dense, quiet pill
 * used for scopes/status/counts throughout the app. Pass `tone` for semantics
 * and any HeroUI ChipProps (variant/size/startContent/onClose/…) to override.
 */
export function Chip({
  tone = 'neutral',
  variant = 'flat',
  size = 'sm',
  radius = 'sm',
  ...rest
}: ChipUIProps): React.ReactElement {
  return <HeroChip color={TONE_TO_COLOR[tone]} variant={variant} size={size} radius={radius} {...rest} />
}

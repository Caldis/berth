import { useTranslation } from 'react-i18next'
import { Chip } from '@/components/ui'
import type { AssetScope } from '@shared/types/asset'

/**
 * Neutral scope pill, built on the shared semantic Chip (GH-105). Scopes stay
 * deliberately neutral (no category hues) — tone="neutral" follows dark/light.
 *
 * The pill shape (full radius + padding + weight) is baked in here so every call
 * site renders identically. It intentionally does NOT accept a `className`:
 * appearance is fixed in the component, not negotiated per call site. This is the
 * fix for the drift where some pages passed `rounded-full px-2 font-semibold` and
 * others didn't (GH-136: shared composites must constrain表现, 不开外观 className 逃生舱).
 */
export function ScopeBadge({ scope }: { scope: AssetScope }): React.ReactElement {
  const { t } = useTranslation()

  return (
    <Chip tone="neutral" variant="flat" size="sm" radius="full" className="px-2 font-semibold">
      {t(`common.scope.${scope}`)}
    </Chip>
  )
}

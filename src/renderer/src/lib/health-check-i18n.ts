import type { TFunction } from 'i18next'
import type { HealthCheck } from '@shared/types/ipc'

type TranslateValues = Record<string, string | number>

// GH #6 Phase-2: the engine emits stable i18n keys for every prose field
// (HealthCheck.i18nKeys + HealthCheckEvidence.labelKey + HealthCheck.params), so
// the renderer localizes by key instead of reverse-matching English prose. Fields
// with no key (raw TOML/YAML/JSON parser or fs error messages) keep the engine's
// raw text. The legacy EXACT_TEXT_KEYS / PATTERN_TEXT_KEYS prose tables were
// removed once every keyable field carried a key (Phase-2D).
export function localizeHealthCheck(check: HealthCheck, t: TFunction): HealthCheck {
  const keys = check.i18nKeys
  const params = check.params
  return {
    ...check,
    title: localizeField(check.title, keys?.title, params, t),
    message: localizeField(check.message, keys?.message, params, t),
    suggestion: check.suggestion
      ? localizeField(check.suggestion, keys?.suggestion, params, t)
      : undefined,
    evidence: check.evidence?.map((evidence) => ({
      ...evidence,
      label: localizeField(evidence.label, evidence.labelKey, undefined, t)
    })),
    fix: check.fix
      ? {
          ...check.fix,
          label: localizeField(check.fix.label, keys?.fixLabel, params, t),
          description: localizeField(check.fix.description, keys?.fixDescription, params, t)
        }
      : undefined
  }
}

// Resolve via the emitted key (with params interpolation); fall back to the
// engine's raw text when no key is supplied (raw parser/fs error strings).
function localizeField(
  text: string,
  key: string | undefined,
  params: TranslateValues | undefined,
  t: TFunction
): string {
  if (key) return t(key, { ...params, defaultValue: text })
  return text
}

export function localizeHealthCheckScope(scope: string, t: TFunction): string {
  return t(`common.scope.${scope}`, { defaultValue: scope })
}

export function localizeHealthCheckConfidence(confidence: string, t: TFunction): string {
  return t(`healthChecks.text.confidence.${confidence}`, { defaultValue: confidence })
}

export function localizeHealthCheckAssetType(assetType: string, t: TFunction): string {
  return t(`healthChecks.text.assetTypes.${assetType}`, { defaultValue: assetType })
}

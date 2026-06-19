import type { TFunction } from 'i18next'
import type { ScanRoot, ScanSourceStatus } from '@shared/types/asset'

interface SourceCopy {
  title: string
  summary?: string
  actionHint?: string
}

export function getScanSourceCopy(t: TFunction, source: ScanRoot): SourceCopy {
  if (source.code) {
    const base = `sources.code.${source.code}`
    const title = t(`${base}.title`, { defaultValue: '' })
    if (title) {
      const summary = t(`${base}.summary`, { defaultValue: '' })
      const actionHint = t(`${base}.actionHint`, { defaultValue: '' })
      return {
        title,
        summary: summary || undefined,
        actionHint: actionHint || undefined
      }
    }
  }
  return {
    title: source.description ?? source.code ?? source.path,
    summary: source.summary ?? source.path
  }
}

export function getScanSourceStatusLabel(t: TFunction, status: NonNullable<ScanRoot['status']>): string {
  return t(`sources.status.${status}`)
}

export function formatScanSourceStatusCount(
  t: TFunction,
  status: ScanSourceStatus,
  count: number
): string {
  const label = t(`sources.status.${status}`)
  return t('sources.statusCount', { count, label })
}

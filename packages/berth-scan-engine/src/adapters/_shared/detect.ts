import type { ScanRoot } from '@shared/types/asset'

export function detectedFromSources(
  sources: ScanRoot[],
  isDetectionSource: (source: ScanRoot) => boolean
): boolean {
  return sources.some((source) => source.status === 'scanned' && isDetectionSource(source))
}

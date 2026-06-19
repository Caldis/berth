// GH-144: shared "show scanning / empty placeholder" predicate, de-duplicated
// from the byte-identical checks in capabilities + instructions pages. True when a
// scan is actively running, or the runtime is idle and nothing has been indexed yet.

export function shouldShowScanningState(
  scanning: boolean,
  runtimeState: string,
  assetCount: number
): boolean {
  return scanning || (runtimeState === 'idle' && assetCount === 0)
}

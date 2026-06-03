import { useCallback } from 'react'
import type { Asset } from '@shared/types/asset'
import { FileViewerButton } from '@/components/shared/file-viewer-button'

interface ViewRawButtonProps {
  asset: Asset
  label?: string
  className?: string
}

export function ViewRawButton({ asset, label, className }: ViewRawButtonProps): React.ReactElement {
  const loadContent = useCallback(async () => {
    const full = await window.api?.assets.get(asset.id) as Asset | null | undefined
    return full?.raw ?? asset.raw
  }, [asset.id, asset.raw])

  return (
    <FileViewerButton
      path={asset.path}
      loadContent={loadContent}
      label={label}
      className={className}
    />
  )
}

import { useAppStore } from '@/stores/app'
import { FileViewerDrawer } from '@/components/shared/file-viewer-drawer'

export function InspectorDrawer(): React.ReactElement | null {
  const open = useAppStore((s) => s.inspectorOpen)
  const path = useAppStore((s) => s.inspectorPath)
  const content = useAppStore((s) => s.inspectorContent)
  const closeInspector = useAppStore((s) => s.closeInspector)
  return <FileViewerDrawer open={open} path={path} content={content} onClose={closeInspector} />
}

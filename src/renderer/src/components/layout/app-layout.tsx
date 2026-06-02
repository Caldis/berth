import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { SearchDialog } from './search-dialog'
import { InspectorDrawer } from './inspector-drawer'
import { SIDEBAR_COLLAPSED_WIDTH, useAppStore } from '@/stores/app'
import { isWindowsPlatform } from '@/lib/platform'
import { WindowControls } from './window-controls'
import { useAssets } from '@/hooks/use-ipc'

export function AppLayout({ children }: { children: ReactNode }): React.ReactElement {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const isWindows = isWindowsPlatform()
  const effectiveSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth
  useAssets()

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main
        className="min-w-0 flex-1 overflow-auto transition-[margin] duration-200"
        style={{ marginLeft: effectiveSidebarWidth }}
      >
        <div
          className={
            isWindows ? 'titlebar-drag mr-40 h-9 shrink-0' : 'titlebar-drag h-9 w-full shrink-0'
          }
        />
        <div className="px-6 pb-6">{children}</div>
      </main>
      {isWindows && <WindowControls />}
      <SearchDialog />
      <InspectorDrawer />
    </div>
  )
}

import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { SearchDialog } from './search-dialog'
import { InspectorDrawer } from './inspector-drawer'
import { useAppStore } from '@/stores/app'
import { isWindowsPlatform } from '@/lib/platform'
import { WindowControls } from './window-controls'
import { useAssets } from '@/hooks/use-ipc'

export function AppLayout({ children }: { children: ReactNode }): React.ReactElement {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const isWindows = isWindowsPlatform()
  useAssets()

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main
        className="flex-1 overflow-auto transition-[margin] duration-200"
        style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
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

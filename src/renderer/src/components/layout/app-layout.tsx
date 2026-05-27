import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { SearchDialog } from './search-dialog'
import { useAppStore } from '@/stores/app'

export function AppLayout({ children }: { children: ReactNode }): React.ReactElement {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main
        className="flex-1 overflow-auto transition-[margin] duration-200"
        style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
      >
        <div className="titlebar-drag h-9 w-full shrink-0" />
        <div className="px-6 pb-6">{children}</div>
      </main>
      <SearchDialog />
    </div>
  )
}

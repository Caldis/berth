import type { ComponentType } from 'react'
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Plug,
  BarChart3
} from 'lucide-react'

export interface NavItem {
  id: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
  path: string
}

export interface NavSection {
  labelKey?: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    items: [{ id: 'overview', labelKey: 'nav.overview', icon: LayoutDashboard, path: '/' }]
  },
  {
    items: [{ id: 'sessions', labelKey: 'nav.sessions', icon: MessageSquare, path: '/sessions' }]
  },
  {
    labelKey: 'nav.configuration',
    items: [
      {
        id: 'instructions',
        labelKey: 'nav.instructions',
        icon: FileText,
        path: '/configuration/instructions'
      },
      {
        id: 'capabilities',
        labelKey: 'nav.capabilities',
        icon: Plug,
        path: '/configuration/capabilities'
      }
    ]
  },
  {
    items: [{ id: 'usage', labelKey: 'nav.usage', icon: BarChart3, path: '/usage' }]
  }
]

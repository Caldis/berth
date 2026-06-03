import type { ComponentType } from 'react'
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Plug,
  BarChart3,
  Brain,
  Sparkles,
  Bot,
  Terminal,
  Palette,
  Webhook,
  Puzzle,
  Activity,
  Shield,
  Variable
} from 'lucide-react'

export interface NavItem {
  id: string
  labelKey: string
  descriptionKey?: string
  icon: ComponentType<{ className?: string }>
  path: string
  legacyPaths?: string[]
}

export interface NavSection {
  id: string
  labelKey?: string
  items: NavItem[]
}

export const instructionNavItems = [
  {
    id: 'instruction-memories',
    labelKey: 'instructions.tabs.memories',
    descriptionKey: 'nav.descriptions.memories',
    icon: Brain,
    path: '/instructions/memories'
  },
  {
    id: 'instruction-conventions',
    labelKey: 'instructions.tabs.conventions',
    descriptionKey: 'nav.descriptions.conventions',
    icon: FileText,
    path: '/instructions/conventions'
  },
  {
    id: 'instruction-skills',
    labelKey: 'instructions.tabs.skills',
    descriptionKey: 'nav.descriptions.skills',
    icon: Sparkles,
    path: '/instructions/skills',
    legacyPaths: ['/configuration/instructions']
  },
  {
    id: 'instruction-subagents',
    labelKey: 'instructions.tabs.subagents',
    descriptionKey: 'nav.descriptions.subagents',
    icon: Bot,
    path: '/instructions/subagents'
  },
  {
    id: 'instruction-commands',
    labelKey: 'instructions.tabs.commands',
    descriptionKey: 'nav.descriptions.commands',
    icon: Terminal,
    path: '/instructions/commands'
  },
  {
    id: 'instruction-output-modes',
    labelKey: 'instructions.tabs.outputModes',
    descriptionKey: 'nav.descriptions.outputModes',
    icon: Palette,
    path: '/instructions/output-modes'
  }
] as const satisfies readonly NavItem[]

export const capabilityNavItems = [
  {
    id: 'capability-mcp',
    labelKey: 'capabilities.tabs.mcp',
    descriptionKey: 'nav.descriptions.mcp',
    icon: Plug,
    path: '/capabilities/mcp',
    legacyPaths: ['/configuration/capabilities']
  },
  {
    id: 'capability-hooks',
    labelKey: 'capabilities.tabs.hooks',
    descriptionKey: 'nav.descriptions.hooks',
    icon: Webhook,
    path: '/capabilities/hooks',
    legacyPaths: ['/configuration/capabilities?tab=hooks']
  },
  {
    id: 'capability-plugins',
    labelKey: 'capabilities.tabs.plugins',
    descriptionKey: 'nav.descriptions.plugins',
    icon: Puzzle,
    path: '/capabilities/plugins',
    legacyPaths: ['/configuration/capabilities?tab=plugins']
  },
  {
    id: 'capability-status-line',
    labelKey: 'capabilities.tabs.statusLine',
    descriptionKey: 'nav.descriptions.statusLine',
    icon: Activity,
    path: '/capabilities/status-line',
    legacyPaths: ['/configuration/capabilities?tab=statusLine']
  },
  {
    id: 'capability-permissions',
    labelKey: 'capabilities.tabs.permissions',
    descriptionKey: 'nav.descriptions.permissions',
    icon: Shield,
    path: '/capabilities/permissions',
    legacyPaths: ['/configuration/capabilities?tab=permissions']
  },
  {
    id: 'capability-env',
    labelKey: 'capabilities.tabs.env',
    descriptionKey: 'nav.descriptions.env',
    icon: Variable,
    path: '/capabilities/env',
    legacyPaths: ['/configuration/capabilities?tab=env']
  }
] as const satisfies readonly NavItem[]

export const navSections: NavSection[] = [
  {
    id: 'overview',
    items: [{ id: 'overview', labelKey: 'nav.overview', icon: LayoutDashboard, path: '/' }]
  },
  {
    id: 'work',
    labelKey: 'nav.sections.work',
    items: [{ id: 'sessions', labelKey: 'nav.sessions', icon: MessageSquare, path: '/sessions' }]
  },
  {
    id: 'instructions',
    labelKey: 'nav.sections.instructions',
    items: [...instructionNavItems]
  },
  {
    id: 'capabilities',
    labelKey: 'nav.sections.capabilities',
    items: [...capabilityNavItems]
  },
  {
    id: 'operations',
    labelKey: 'nav.sections.operations',
    items: [{ id: 'usage', labelKey: 'nav.usage', icon: BarChart3, path: '/usage' }]
  }
]

export function flattenNavItems(): NavItem[] {
  return navSections.flatMap((section) => section.items)
}

export function navItemMatchesLocation(item: NavItem, pathname: string, search = ''): boolean {
  const current = `${pathname}${search}`
  if (matchesPath(item.path, pathname)) return true
  return item.legacyPaths?.some((legacyPath) => {
    if (legacyPath.includes('?')) return legacyPath === current
    return matchesPath(legacyPath, pathname)
  }) ?? false
}

export function findNavMatch(pathname: string, search = ''): { section: NavSection; item: NavItem } | null {
  for (const section of navSections) {
    for (const item of section.items) {
      if (navItemMatchesLocation(item, pathname, search)) {
        return { section, item }
      }
    }
  }
  return null
}

function matchesPath(itemPath: string, pathname: string): boolean {
  if (itemPath === '/') return pathname === '/'
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

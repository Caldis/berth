export type MemorySourceId = 'claude-native' | 'united-memory' | (string & { readonly __memorySourceId?: never })

export type MemoryImportance = 'core' | 'active' | 'archive' | 'unknown'

export interface MemoryNote {
  id: string // 稳定全局 id: `${sourceId}:${localId}`
  sourceId: MemorySourceId
  sourceLabel: string // 展示名, e.g. "United Memory"
  title: string
  summary?: string
  tags: string[]
  importance: MemoryImportance
  scope?: string // native: project slug
  path: string // 文件路径 (用于 "在资源管理器显示")
  links: string[]
  createdAt: string | null
  updatedAt: string | null
  body?: string // 详情按需填充
}

export interface MemorySourceStatus {
  id: MemorySourceId
  label: string
  available: boolean
  rootPath: string
  noteCount: number
  error?: string
}

export interface MemoryListResult {
  notes: MemoryNote[] // 已聚合, 每条带 sourceId/sourceLabel
  sources: MemorySourceStatus[] // 含不可用源 (available:false) 供 UI 显示/过滤
}

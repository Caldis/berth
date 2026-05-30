# 02-SPEC — 设计

## 决策摘要

- 记忆**独立建模** (`MemoryNote`), 不复用 25+ 类的 `Asset` 体系 (语义干净: 聚合/来源标签/详情)。
- 独立 `MemoryService` (不并入 `AssetScanner`), 经**新 IPC 通道 `memory:*`** 暴露。
- `MemorySource` 为可替换抽象; 新增源 = 实现接口 + 注册一行, 不改 UI/IPC 契约。
- 全只读; 解析为纯函数, fixture 单测。

## 类型 (新文件 `src/shared/types/memory.ts` — 无碰撞)

```ts
export type MemorySourceId = 'claude-native' | 'united-memory' | (string & {})
export type MemoryImportance = 'core' | 'active' | 'archive' | 'unknown'

export interface MemoryNote {
  id: string                 // 稳定全局 id: `${sourceId}:${localId}`
  sourceId: MemorySourceId
  sourceLabel: string        // 展示名, e.g. "United Memory"
  title: string
  summary?: string
  tags: string[]
  importance: MemoryImportance
  scope?: string             // native: project slug
  path: string               // 文件路径 (用于 "在资源管理器显示")
  links: string[]
  createdAt: string | null
  updatedAt: string | null
  body?: string              // 详情按需填充
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
  notes: MemoryNote[]            // 已聚合, 每条带 sourceId/sourceLabel
  sources: MemorySourceStatus[]  // 含不可用源 (available:false) 供 UI 显示/过滤
}
```

## 适配抽象 (新文件 `src/main/memory/types.ts`)

```ts
export interface MemorySource {
  readonly id: MemorySourceId
  readonly label: string
  detect(): Promise<MemorySourceStatus>          // 可用性 + rootPath + count
  list(): Promise<MemoryNote[]>                   // 仅元数据 (无 body)
  read(localId: string): Promise<MemoryNote | null> // 全量 (含 body)
}
```

## 源实现 (新文件, 无碰撞)

### `src/main/memory/sources/united-memory.ts`
- root: `~/.united-memory` (探测 `index.json` 存在性)。
- `list()`: 读 `index.json.entries[]` → MemoryNote (importance 直取 entry.importance; **以 index 为准, 不裸 glob 避开畸形文件**)。
- `read(id)`: 读 `mem/<id>.md`, 解析 frontmatter + 提取 `## TL;DR` 作 summary, body=正文。
- 纯解析: `parseUnitedIndex(json)` / `parseUnitedNote(md)` 导出供单测。

### `src/main/memory/sources/claude-native.ts`
- root: `~/.claude/projects/<slug>/memory/`。遍历 projects/* 找 `MEMORY.md` + 同目录笔记。
- 笔记 frontmatter: `name/description/metadata.type(user|feedback|project|reference)`。
  映射: title=name||文件名; summary=description; tags=[metadata.type]; importance='active'; scope=slug。
- 纯解析: `parseNativeNote(md)` / `parseMemoryIndex(md)` 导出供单测。
- 本机当前为空 → status.available=false 或 noteCount=0 (UI 优雅处理)。

## 聚合服务 (新文件 `src/main/memory/index.ts`)

```ts
const sources: MemorySource[] = [new UnitedMemorySource(), new ClaudeNativeSource(projectDir)]
export async function listMemory(): Promise<MemoryListResult>   // detect+list 所有可用源, 聚合
export async function readMemory(globalId: string): Promise<MemoryNote | null> // 按 sourceId 前缀路由
```

## IPC (共享热点⚠ — 最小外科改动)

- `src/shared/types/ipc.ts`: 加 `'memory:list' → MemoryListResult`, `'memory:get'(id) → MemoryNote|null`。
- `src/main/ipc/handlers.ts`: `ipcMain.handle('memory:list', listMemory)` / `('memory:get', (_,id)=>readMemory(id))`。
- `src/preload/index.ts(.d.ts)`: `window.api.memory = { list, get }`。

## 渲染 (部分共享)

- 新 hook `src/renderer/src/hooks/use-memory.ts`: 调 `window.api.memory.list()` → {notes, sources, loading}。
- 新组件 `src/renderer/src/components/memory/memory-view.tsx`: 列表 + 来源 badge + 源过滤
  (segmented/下拉, 选项来自 sources) + 空态 + 点击详情 (lazy `memory:get`)。
- `src/renderer/src/pages/instructions.tsx`: "记忆" tab 改渲染 `<MemoryView/>`;
  原 `claude-md`/`agents-md` 迁到新 tab key `conventions`(约定) (i18n 补 label), 不丢失。
- i18n `locales/{en,zh}.json`: 加 `memory.*` + `instructions.tabs.conventions`。

## 测试 (新文件, 无碰撞)

- `tests/unit/memory-united-memory.test.ts`: fixture (index.json + mem/*.md, 含 1 个畸形文件) →
  断言 MemoryNote[] 正确、畸形被排除、importance/tags/links 解析对。
- `tests/unit/memory-claude-native.test.ts`: fixture MEMORY.md + 2 笔记 → 断言解析与 scope。

## 可测试性

所有解析为纯函数 (输入字符串/JSON → MemoryNote), 不碰 fs/IPC; service 注入 root 路径以便测试。

## 验收对齐 PRD

满足 PRD 验收 1-5: 接口+2实现+注册聚合 / 面板只读展示真实记忆(本机来自 united-memory ~38 条)+来源标签+过滤 / 单测 / 全门禁+截图 / 加源零改契约。

import type { Asset, AssetScope } from '@shared/types/asset'

// GH-115 T9: per-agent「项目级扫描源」声明的统一形状。
// 数据本体在 adapters/{claude-code,codex}/sources.ts; engine 经
// engine/agent-capabilities.ts 单点聚合消费 (shallow / derive / watcher 三方),
// 不再各自维护 mirror 表。新增一种项目级资产目录 = 改 adapter 的 sources 表一处。

export interface ProjectCapabilitySource {
  /** glob: 目录递归匹配 (shallow 全量枚举 + derive 按 dir+fileName/ext 单文件命中) */
  kind: 'glob' | 'file'
  /** glob: 项目相对目录 */
  dir?: string
  /** glob: shallow 枚举用 pattern (如 **\/SKILL.md) */
  pattern?: string
  /** glob: derive 单文件命中 — 精确文件名 (SKILL.md) */
  fileName?: string
  /** glob: derive 单文件命中 — 扩展名 (.md / .toml) */
  ext?: string
  /** file: 项目相对路径 (单文件多资产配置) */
  file?: string
  /** 解析器 (file-kind 可产多资产; scope 由消费方传入 — shallow 恒 'project', derive 走 inferScope) */
  parse: (filePath: string, scope: AssetScope) => Asset[]
}

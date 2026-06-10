# 描述
- claude-code 与 codex 两个 adapter 之间存在大量解析逻辑重复 (标量 helper 逐字复制、markdown 解析复制、session artifact 解析复制、session meta 结构重复), 且无 adapter 公共内核出口。重复已在 `splitFrontmatter` 上发生实现漂移 — 预示第三个 agent adapter 加入即第三份复制。

# 证据 (确切行号)
- 标量 helper 三处复制: `readString` claude/parsers.ts:1019 · codex/parsers.ts:986 · claude/session-detail.ts:320; `isRecord` 1132/1064/351; `uniqueStrings` 1136/1040/343; `safeId` codex/parsers.ts:1044 · session-detail.ts:347。
- `extractAtImports`: claude/parsers.ts:61 (export) 与 codex/parsers.ts:382 两份字面相同。
- `splitFrontmatter`: claude/parsers.ts:1102 (正则) vs codex/parsers.ts:393 (indexOf) — 同义不同实现, 已漂移。
- session artifact: `extractPaths` codex/parsers.ts:834 · claude/session-detail.ts:267; `parseMcpToolName` codex/parsers.ts:871 · session-detail.ts:301 — 完全复制。
- session meta: `projectNameFromPath` claude/parsers.ts:1086 · codex/parsers.ts:1021; `parseSessionMeta` vs `parseCodexSessionMeta` 骨架同 (JSONL 迭代 + 字段聚合 + duration)。

# 进展 (2026-06-10, 全部完成)
- **标量 helper**: `readString`/`isRecord`/`uniqueStrings`/`safeId` 三份 → `_shared/parser-helpers` (e1231e3); 续抽 `readNumber`/`readBoolean`/`readValidDateString` (三份) + `firstString` (两份) (35ced4d)。
- **markdown**: `extractAtImports` (a1e1a11); `splitFrontmatter` 语义核对后统一 (0ff2237) — 闭合 fence 须独占一行 (正则向)、允许 EOF 闭合与空 frontmatter (indexOf 向)、非 record YAML 返回 null (修 claude 标量 spread 泄漏垃圾键)、YAML 解析失败仍剥离 fence、body 不带闭合后换行 (修 codex bodyLength 偏 1); 13 单测钉边界。
- **session-artifacts**: `extractPaths`/`collectPaths`/`parseMcpToolName`/`upsertFile` → `_shared/session-artifacts` (d88b3a2); `isPathKey` 为证据未记录的第二处漂移 (codex 多收 `paths`/`file`/`files`), 统一取超集并测试钉住; claude `extractMcpServerName` 同逻辑只取 server, 折为 `parseMcpToolName(...)?.server` (35ced4d)。
- **session-meta**: `calculateDurationSeconds`/`projectNameFromPath` 两份 → `_shared/session-meta` (35ced4d)。
- **token 字段别名表**: `@shared/token-usage` 导出 `TOKEN_BREAKDOWN_ALIAS_KEYS` (刻意排除 total 别名), codex `readNestedTokenRecord` 弃用本地 6 键 snake_case 副本 (cd2cdc2)。
- **cost**: 核实 codex 不读 cost, `readExplicitCost` 仅 claude 一份, 无跨 adapter 重复 — 不抽 (单消费者抽取属投机)。

# 残留 (范围外, 已转交)
- `parseSessionMeta` vs `parseCodexSessionMeta` 的 JSONL 迭代骨架为结构相似 (事件 schema 各异), 模板化属投机抽象, 判定不做。
- `src/main/memory/sources/claude-native.ts:58` 与 `united-memory.ts:109` 另有两份 `splitFrontmatter` 变体 (返回 `{}` 而非 null), 受 memory↛adapters 依赖方向限制无法直接复用 `_shared`, 已记入 2026-06-09-IMPROVEMENT-engine-shared-core-package.md 随成包收敛。

# 预期 · 建议
- 抽 `src/main/adapters/_shared/`: parser-helpers (标量)、markdown (extractAtImports/splitFrontmatter)、session-artifacts (extractPaths/upsertFile/parseMcpToolName)、cost/token 字段别名表; 各 agent 只写差异。
- 该内聚同时是 2026-06-09-IMPROVEMENT-engine-shared-core-package.md 物理迁移的预演。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-engine-shared-core-package.md、2026-06-09-IMPROVEMENT-shared-path-and-type-config.md。
- 状态: RESOLVED (2026-06-10, 提交 e1231e3 · a1e1a11 · 0ff2237 · d88b3a2 · 35ced4d · cd2cdc2)。

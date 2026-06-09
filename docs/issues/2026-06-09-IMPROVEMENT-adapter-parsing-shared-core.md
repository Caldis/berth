# 描述
- claude-code 与 codex 两个 adapter 之间存在大量解析逻辑重复 (标量 helper 逐字复制、markdown 解析复制、session artifact 解析复制、session meta 结构重复), 且无 adapter 公共内核出口。重复已在 `splitFrontmatter` 上发生实现漂移 — 预示第三个 agent adapter 加入即第三份复制。

# 证据 (确切行号)
- 标量 helper 三处复制: `readString` claude/parsers.ts:1019 · codex/parsers.ts:986 · claude/session-detail.ts:320; `isRecord` 1132/1064/351; `uniqueStrings` 1136/1040/343; `safeId` codex/parsers.ts:1044 · session-detail.ts:347。
- `extractAtImports`: claude/parsers.ts:61 (export) 与 codex/parsers.ts:382 两份字面相同。
- `splitFrontmatter`: claude/parsers.ts:1102 (正则) vs codex/parsers.ts:393 (indexOf) — 同义不同实现, 已漂移。
- session artifact: `extractPaths` codex/parsers.ts:834 · claude/session-detail.ts:267; `parseMcpToolName` codex/parsers.ts:871 · session-detail.ts:301 — 完全复制。
- session meta: `projectNameFromPath` claude/parsers.ts:1086 · codex/parsers.ts:1021; `parseSessionMeta` vs `parseCodexSessionMeta` 骨架同 (JSONL 迭代 + 字段聚合 + duration)。

# 预期 · 建议
- 抽 `src/main/adapters/_shared/`: parser-helpers (标量)、markdown (extractAtImports/splitFrontmatter)、session-artifacts (extractPaths/upsertFile/parseMcpToolName)、cost/token 字段别名表; 各 agent 只写差异。
- 该内聚同时是 2026-06-09-IMPROVEMENT-engine-shared-core-package.md 物理迁移的预演。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-engine-shared-core-package.md、2026-06-09-IMPROVEMENT-shared-path-and-type-config.md。
- 状态: OPEN。

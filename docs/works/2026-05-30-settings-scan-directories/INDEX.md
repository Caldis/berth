---
task: 2026-05-30-settings-scan-directories
type: bug
jira:
phase: verify
created: 2026-05-30
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# Settings scan directories

任务索引与交接锚。phase 字段为唯一状态源, `opsx-continue` 据此续跑。

## GitHub Project
- project: berth (#6)
- item: PVTI_lAHOADXbEs4BZHvQzguP6hQ
- status: In Progress

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)

本轮本地来源可读性改进已完成。`pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm harness:check` 通过; `pnpm lint` 仍被非本任务文件 `src/shared/types/memory.ts` 第 1 行的 `@typescript-eslint/ban-types` 阻塞, 并有并行 hooks 页面改动产生的 exhaustive-deps warning。memory lint 问题已记录为 `docs/issues/2026-05-30-BUG-memory-source-id-lint-failure.md`。

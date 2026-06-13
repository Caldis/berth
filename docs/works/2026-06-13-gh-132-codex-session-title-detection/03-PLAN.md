# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 给 Codex parser 增加 title index 读取与 session title 兜底
  - tests: 先更新 `tests/unit/codex-session-parser.test.ts`, 覆盖 `session_index.jsonl` 的 `id/thread_name`、rollout 内 `thread_name_updated` 兼容、缺失/坏 JSON 不失败、异常长标题截断。
  - verify: `pnpm test -- tests/unit/codex-session-parser.test.ts tests/unit/codex-adapter.test.ts` 通过; UI 验收项为标题数据正确、列表不显示异常长原文。
- [x] 任务 2: 在 Codex adapter 中按 Codex home 接入 `session_index.jsonl`, active/archived session 都使用索引标题
  - tests: 更新 `tests/unit/codex-adapter.test.ts`, 让 active 和 archived fixture 在没有 `thread_name_updated` 时显示 index title。
  - verify: `pnpm test -- tests/unit/codex-session-parser.test.ts tests/unit/codex-adapter.test.ts` 通过; UI 验收项为 `SessionSummary.title` 数据源修复, renderer 无需特判。
- [x] 任务 3: 同步 source descriptor、source coverage、source copy 和相关测试
  - tests: 更新 `tests/unit/agent-capability-plugins.test.ts`; 必要时更新 renderer settings 测试。
  - verify: `pnpm test -- tests/unit/codex-adapter.test.ts tests/unit/agent-capability-plugins.test.ts tests/renderer/settings-agent-plugins.test.tsx` 通过; `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-13-gh-132-codex-session-title-detection`; UI 验收项为设置/插件来源文案不暴露 raw key。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

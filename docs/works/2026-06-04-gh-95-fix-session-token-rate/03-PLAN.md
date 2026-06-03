# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 抽出主进程 session activity metric 纯函数, 对过短 usage 窗口返回 unavailable。
  - tests: `pnpm vitest run tests/unit/session-activity.test.ts` - passed, 3 tests; 覆盖 `usageDuration=1` 时不返回巨大 tok/min, `usageDuration=60` 时正常返回 rate, 无 token 时 unavailable。
  - verify: `pnpm vitest run tests/unit/session-activity.test.ts`; 界面质量与交互验收项: reliable/unreliable 状态数据源正确, renderer 可继续用现有 `SignalMetric` 展示。
- [x] 任务 2: 让 `sessions:get` 使用新的纯函数, 保持 renderer 展示和 IPC 类型不变。
  - tests: `pnpm vitest run tests/renderer/sessions-pages.test.tsx` - passed, 24 tests; Session Detail unknown/rate 展示未退化。
  - verify: `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-95-fix-session-token-rate`; 界面质量与交互验收项: 不新增页面结构, token rate 仍显示在 Session signals, 过短窗口显示 `—` 与现有短文案。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

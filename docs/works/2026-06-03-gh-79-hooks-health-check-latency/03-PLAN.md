# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] 任务 1: 扩展健康检查 IPC 请求参数, main 端避免非强制路径重复全量扫描
  - tests: `pnpm typecheck:node`; 必要时补 main/IPC 单测
  - verify: `assets:health-check` 默认复用已扫描 scanner 缓存; `{ refresh: true }` 仍强制 `scanAll()`; 非 UI。
- [ ] 任务 2: 为 `useHealthChecks` 增加共享缓存、TTL、in-flight 去重和 assets changed 强制刷新
  - tests: `pnpm vitest run tests/renderer/use-health-checks.test.tsx`
  - verify: 首次加载会请求; 第二个挂载命中缓存不重复请求; 并发挂载只发一次请求; `assets:changed` 保留旧结果并用 `{ refresh: true }` 刷新。
- [ ] 任务 3: 在 Hooks 生命周期 sidebar 展示 stale/refreshing 状态, 不新增平铺说明
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: sidebar tag 显示 `Refreshing`; hover/focus tooltip 说明当前展示旧结果并后台刷新 Hook + 当前 Agent 视角; 旧 severity tag 仍可见; 不改变 sticky sidebar 和卡片层级。
- [ ] 任务 4: 回归检查与阶段收口
  - tests: `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm harness:check`
  - verify: 任务计划中的测试证据完整; Project 字段同步; 进入 verify 阶段。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

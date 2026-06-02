# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 扩展健康检查 IPC 请求参数, main 端避免非强制路径重复全量扫描
  - tests: `pnpm typecheck:node` - passed.
  - verify: `assets:health-check` 默认复用已扫描 scanner 缓存; `{ refresh: true }` 仍强制 `scanAll()`; 非 UI。
- [x] 任务 2: 为 `useHealthChecks` 增加共享缓存、TTL、in-flight 去重和 assets changed 强制刷新
  - tests: `pnpm vitest run tests/renderer/use-health-checks.test.tsx` - 4 tests passed; `pnpm typecheck:web` - passed.
  - verify: 首次加载会请求; 第二个挂载命中缓存不重复请求; 并发挂载只发一次请求; `assets:changed` 保留旧结果并用 `{ refresh: true }` 刷新。
- [x] 任务 3: 在 Hooks 生命周期 sidebar 展示 stale/refreshing 状态, 不新增平铺说明
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` - 26 tests passed; `pnpm vitest run tests/renderer/use-health-checks.test.tsx tests/renderer/overview-health-checks.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx` - 34 tests passed; `pnpm typecheck:web` - passed.
  - verify: sidebar tag 显示 `Refreshing`; hover/focus tooltip 说明当前展示旧结果并后台刷新 Hook + 当前 Agent 视角; 旧 severity tag 仍可见; 不改变 sticky sidebar 和卡片层级。
- [x] 任务 4: 回归检查与阶段收口
  - tests: `pnpm lint` - passed; `pnpm typecheck` - passed; `pnpm test` - 72 files / 548 tests passed; `pnpm harness:check --work docs/works/2026-06-03-gh-79-hooks-health-check-latency` - passed.
  - verify: `gh run list --branch master --limit 5` 显示最新当前会话提交 `feat(hooks): show stale health refresh state` 的 CI success; `node scripts/harness-projects.mjs check --strict` - passed; `pnpm harness:stats` 显示 debt status=ok。
  - UI: agent-owned Electron `gh79-hooks-health` 进入 能力 > Hooks, 确认生命周期 sidebar 为 `lg:sticky lg:top-4 lg:self-start`, `Hook 检查` 位于 sidebar 内, 状态 tag 显示 `正常`, hover/focus tooltip 展示正常说明; renderer 截图保存在 `C:/Users/mail/AppData/Local/Temp/berth-gh79-hooks-health-sidebar.png`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

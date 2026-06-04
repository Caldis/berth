# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 1. 添加第三方依赖与测试基线
  - scope: `package.json`, `pnpm-lock.yaml`, 必要的 test mock/setup。
  - tests: `pnpm typecheck:web` passed。
  - verify: `package.json` 与 `pnpm-lock.yaml` 只新增 `react-virtuoso@4.18.7`、`@radix-ui/react-navigation-menu@1.2.14`; `rg` 确认 `@tanstack/react-virtual` 未进入 lockfile。

- [x] 2. 建 shared virtual list 与 category jump nav
  - scope: `src/renderer/src/components/shared/virtual-grouped-list.tsx`, `src/renderer/src/components/shared/category-jump-nav.tsx`, `src/renderer/src/hooks/use-app-scroll-parent.ts`, `src/renderer/src/lib/virtual-list-model.ts`。
  - tests: `pnpm test -- tests/renderer/virtual-grouped-list.test.tsx tests/renderer/category-jump-nav.test.tsx` passed; `pnpm typecheck:web` passed。
  - verify: stable key、groupCounts、active group、scrollToGroup、scrollToItem、aria-current、desktop narrow nav 与 mobile sticky nav 均有测试或 DOM 断言。

- [x] 3. 改造 Sessions 列表
  - scope: `src/renderer/src/pages/sessions.tsx`, 必要 i18n key。
  - tests: `pnpm test -- tests/renderer/sessions-pages.test.tsx` passed; `pnpm typecheck:web` passed。
  - verify: renderer test mock 130 sessions 只挂载 30 个 row, 尾部 `Session 129` 不在 DOM; project jump nav 调用 `scrollToIndex({ groupIndex: 1, align: 'start' })`; 搜索输入、loading/empty/stale 与原 session 字段保留。

- [x] 4. 加强 Sessions / Memory refresh cache
  - scope: `src/renderer/src/hooks/use-ipc.ts`, `src/renderer/src/hooks/use-memory.ts`, `src/renderer/src/lib/result-signature.ts`。
  - tests: `pnpm test -- tests/renderer/use-sessions-swr.test.tsx tests/renderer/use-memory-cache.test.tsx` passed; `pnpm test -- tests/renderer/instructions-guidance.test.tsx` passed; `pnpm typecheck:web` passed。
  - verify: Sessions 与 Memory 均覆盖 fresh cache 不重拉、stale cache 保持旧数据并刷新、same-result refresh 复用旧数组/结果引用; in-flight 继续由模块级 promise 去重。

- [ ] 5. 改造 Memories 列表
  - scope: `src/renderer/src/components/memory/memory-view.tsx`, 必要 i18n key。
  - tests: 更新 `tests/renderer/memory-view.test.tsx`; 命令 `pnpm test -- tests/renderer/memory-view.test.tsx`。
  - verify: source/importance/tag/search 使用 shared virtual list; note detail lazy load 与 focus target 保留; source unavailable、missing、tags、links、path、loading/empty/error 状态保留。

- [ ] 6. 改造 Instructions 中 skills/conventions 列表
  - scope: `src/renderer/src/pages/instructions.tsx` 与共享 view model 复用。
  - tests: 更新 `tests/renderer/instructions-guidance.test.tsx` 或新增 focused renderer test; 命令 `pnpm test -- tests/renderer/instructions-guidance.test.tsx`。
  - verify: 至少 skills/conventions 使用 shared virtual list; 若同结构 tabs 同批迁移, tests 覆盖一个代表路径; 未迁移路径在 verify 回写说明。

- [ ] 7. 全量门禁与真实 Electron 验证
  - scope: 代码、任务态文档、可选 e2e。
  - tests: `pnpm typecheck:web`, `pnpm test`, `pnpm harness:check --work docs/works/2026-06-04-gh-98-list-virtualization-refresh-performance`, `pnpm test:e2e -- --grep "large list|sessions"` 或相关现有 e2e。
  - verify: 真实 Electron desktop/mobile 视口确认 DOM 数量、scroll/jump、search、refresh 状态与截图/DOM 证据; 若 e2e 环境不可用, 记录具体阻断命令和替代证据。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

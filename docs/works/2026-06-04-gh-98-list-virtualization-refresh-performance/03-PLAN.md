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

- [x] 5. 改造 Memories 列表
  - scope: `src/renderer/src/components/memory/memory-view.tsx`, 必要 i18n key。
  - tests: `pnpm test -- tests/renderer/memory-view.test.tsx` passed; `pnpm test -- tests/renderer/instructions-guidance.test.tsx` passed; `pnpm typecheck:web` passed。
  - verify: 80 notes renderer test 只挂载 20 个 note card, source jump nav 调用 `scrollToIndex({ groupIndex: 1, align: 'start' })`; source/importance/tag/search、note detail lazy load、focus target、missing、tags、links、path、loading/empty 状态保留。

- [x] 6. 改造 Instructions 中 skills/conventions 列表
  - scope: `src/renderer/src/pages/instructions.tsx` 与共享 view model 复用。
  - tests: `pnpm test -- tests/renderer/instructions-guidance.test.tsx` passed; `pnpm typecheck:web` passed。
  - verify: skills/conventions/subagents/commands/outputModes 共用 `VirtualGroupedList`; 80 skills renderer test 只挂载 25 个 asset card, scope jump nav 调用 `scrollToIndex({ groupIndex: 1, align: 'start' })`。

- [x] 7. 全量门禁与真实 Electron 验证
  - scope: 代码、任务态文档、可选 e2e。
  - tests: `pnpm lint` passed; `pnpm typecheck` passed; `pnpm test` passed (89 files / 645 tests); `pnpm harness:check --work docs/works/2026-06-04-gh-98-list-virtualization-refresh-performance` passed; `node scripts/harness-projects.mjs check --strict --work docs/works/2026-06-04-gh-98-list-virtualization-refresh-performance` passed; `pnpm exec playwright test --grep "can navigate to sessions|can navigate to promoted instruction pages"` passed (2 Electron tests).
  - verify: renderer tests cover Sessions 130 rows -> 30 mounted, Memory 80 notes -> 20 mounted, Instructions 80 skills -> 25 mounted, plus jump nav calls. Agent-owned Electron instance `gh98-verify` confirmed Sessions heading, category nav count 1, visible row count 15, screenshot `/tmp/berth-gh98-sessions-1780540690611.png`; Skills empty-state screenshot `/tmp/berth-gh98-verify-1780540671569.png`. Full-project strict check has unrelated GH-90/GH-95 Project field mismatches; current task strict check passed. Remaining risk: no dedicated real Electron 800-row fixture in this stage.

- [x] 8. 优化 Sessions 项目类目聚合
  - scope: `src/renderer/src/lib/session-location-groups.ts`, `src/renderer/src/pages/sessions.tsx`, `src/renderer/src/lib/virtual-list-model.ts`, `src/renderer/src/components/shared/category-jump-nav.tsx`, i18n 与对应 renderer tests。
  - tests: `pnpm test -- tests/renderer/session-location-groups.test.ts tests/renderer/category-jump-nav.test.tsx tests/renderer/sessions-pages.test.tsx` passed (32 tests); `pnpm typecheck:web` passed。
  - verify: `/` 类目固定在顶部; 同一父目录下的多个项目合并为一个类目; 左侧主标签不再显示大段原始路径; 搜索后的分组与条目 key 稳定; 跳转导航保留第三方 Radix Navigation Menu 实现; 完整路径通过 group/nav `title` 保留。

- [x] 9. 分组优化后的全量门禁
  - scope: 当前 GH-98 代码与任务态文档。
  - tests: `pnpm lint` passed; `pnpm typecheck` passed; `pnpm test` passed (90 files / 650 tests); `pnpm harness:check --work docs/works/2026-06-04-gh-98-list-virtualization-refresh-performance` passed; `pnpm exec playwright test --grep "can navigate to sessions"` passed (1 Electron test)。
  - verify: 工作区在提交后保持 clean; 全量 vitest 仍有既有 React act warning 输出, 但测试结果通过。

- [x] 10. 调整 Sessions 类目层级为父级标题 + 项目项
  - scope: `src/renderer/src/lib/session-location-groups.ts`, `src/renderer/src/lib/virtual-list-model.ts`, `src/renderer/src/components/shared/category-jump-nav.tsx`, `src/renderer/src/pages/sessions.tsx`, tests 与当前 issue/任务态文档。
  - tests: `pnpm test -- tests/renderer/session-location-groups.test.ts tests/renderer/category-jump-nav.test.tsx tests/renderer/sessions-pages.test.tsx` passed (32 tests); `pnpm typecheck:web` passed。
  - verify: 左侧类目从最后一级项目名开始作为可选项; n-1 父级目录只显示为不可点击小标题; `/` 仍保持顶部可选项; 虚拟列表 group key 仍由稳定路径驱动。

- [x] 11. 层级修正后的全量门禁
  - scope: 当前 GH-98 代码与任务态文档。
  - tests: `pnpm lint` passed; `pnpm typecheck` passed; `pnpm test` passed on second run (90 files / 650 tests); `pnpm harness:check --work docs/works/2026-06-04-gh-98-list-virtualization-refresh-performance` passed; `pnpm exec playwright test --grep "can navigate to sessions"` passed (1 Electron test)。
  - verify: 第一次全量 vitest 有一个 Settings 测试波动, 单独重跑该文件通过, 第二次全量 vitest 通过; 该失败路径不涉及本次 Sessions 文件。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

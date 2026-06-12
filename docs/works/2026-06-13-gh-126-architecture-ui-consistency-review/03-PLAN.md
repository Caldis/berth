# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] T1: 收敛筛选 Select Module
  - files: `src/renderer/src/components/ui/filter-select.tsx`, `src/renderer/src/components/ui/index.ts`, `src/renderer/src/components/shared/filter-bar.tsx`, `src/renderer/src/components/sessions/session-filter-bar.tsx`, `src/renderer/src/components/sessions/replay-kind-filter.tsx`, `src/renderer/src/pages/usage.tsx`, `tests/renderer/ui/filter-select.test.tsx`, `tests/renderer/ui/barrel.test.tsx`
  - tests:
    - `pnpm test -- tests/renderer/ui/filter-select.test.tsx tests/renderer/ui/barrel.test.tsx tests/renderer/replay-kind-filter.test.tsx tests/renderer/sessions-pages.test.tsx`
    - `pnpm typecheck:web`
  - verify: `FilterSelect` 集中 36px 高度、边框、背景和 hover/open 状态; 原业务筛选交互由既有 renderer 测试覆盖。
- [x] T2: 评估 PageChrome builder 是否值得实现
  - tests: 待设计; 预计覆盖 `tests/renderer/top-navigation*.test.tsx` 和相关页面 guidance/search 测试。
  - verify: 已评估后暂缓; 当前 helper 只能搬运重复对象, interface 不够深, 暂不实施。
- [x] T3: 抽取 ProjectScopeSwitcher side effect hook
  - files: `src/renderer/src/components/layout/project-scope-switcher.tsx`, `tests/renderer/project-scope-switcher.test.tsx`
  - tests:
    - `pnpm test -- tests/renderer/project-scope-switcher.test.tsx`
    - `pnpm typecheck:web`
    - `pnpm typecheck:test`
  - verify: `useProjectScopeActions` 集中候选加载、scope IPC 同步、project activation、asset snapshot 和 store 写入; 新增 activation 失败测试确认菜单保持打开且旧 scope 不变。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

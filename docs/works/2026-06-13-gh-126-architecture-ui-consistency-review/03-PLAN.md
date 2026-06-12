# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] T1: 收敛筛选 Select Module
  - files: `src/renderer/src/components/ui/filter-select.tsx`, `src/renderer/src/components/ui/index.ts`, `src/renderer/src/components/shared/filter-bar.tsx`, `src/renderer/src/components/sessions/session-filter-bar.tsx`, `src/renderer/src/components/sessions/replay-kind-filter.tsx`, `src/renderer/src/pages/usage.tsx`, `tests/renderer/ui/filter-select.test.tsx`, `tests/renderer/ui/barrel.test.tsx`
  - tests:
    - `pnpm test -- tests/renderer/ui/filter-select.test.tsx tests/renderer/ui/barrel.test.tsx tests/renderer/replay-kind-filter.test.tsx tests/renderer/sessions-pages.test.tsx`
    - `pnpm typecheck:web`
  - verify: `FilterSelect` 集中 36px 高度、边框、背景和 hover/open 状态; 原业务筛选交互由既有 renderer 测试覆盖。
- [ ] T2: 评估 PageChrome builder 是否值得实现
  - tests: 待设计; 预计覆盖 `tests/renderer/top-navigation*.test.tsx` 和相关页面 guidance/search 测试。
  - verify: 只在确认不改变标题、搜索 placeholder、guide 按钮位置和快捷键后实施。
- [ ] T3: 评估 ProjectScopeSwitcher side effect hook
  - tests: 待设计; 预计覆盖 `tests/renderer/project-scope-switcher.test.tsx`、scope/store 相关测试, 必要时跑 project-scope e2e。
  - verify: 这是全局作用域状态流, 需要独立小步和更重验证; 不并入 T1。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

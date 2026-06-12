# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 抽共享搜索控件, 替换顶部局部搜索, 固定 TopNavigation 高度
  - files: `src/renderer/src/components/layout/search-control.tsx`, `src/renderer/src/components/layout/top-navigation.tsx`, 顶部导航相关测试
  - tests: `pnpm exec vitest run tests/renderer/top-navigation-search.test.tsx tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx`
  - verify: header 固定 72px; 页面搜索仍是 textbox, placeholder/aria-label 正确; Ctrl/⌘K 聚焦并全选; 页面说明按钮仍在搜索右侧; 右侧操作不换行撑高。
- [ ] 任务 2: 替换侧栏全局搜索入口和全局搜索弹窗输入
  - files: `src/renderer/src/components/layout/sidebar.tsx`, `src/renderer/src/components/layout/search-dialog.tsx`, `src/renderer/src/components/layout/search-control.tsx`, 对应测试
  - tests: `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx tests/renderer/search-dialog.test.tsx tests/renderer/top-navigation.test.tsx`
  - verify: 侧栏入口仍是 button 且点击打开全局搜索; 全局搜索弹窗输入是 textbox 且自动聚焦; Tab trap、Escape、ArrowUp/Down、Enter 行为不变; Ctrl/⌘K 局部优先、无局部搜索时全局打开。
- [ ] 任务 3: 修正局部搜索 placeholder 与 i18n
  - files: `src/renderer/src/pages/instructions.tsx`, `src/renderer/src/pages/capabilities.tsx`, `src/renderer/src/components/memory/memory-view.tsx`, `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`, 对应测试
  - tests: `pnpm exec vitest run tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/memory-view.test.tsx tests/renderer/sessions-pages.test.tsx`
  - verify: 不再出现 `Search assets... Skills` / `搜索资产… 约定`; 局部搜索统一 `Filter ...` / `筛选...`; 全局搜索仍是 `Search assets...` / `搜索资产…`; Permissions 页仍无局部搜索。
- [ ] 任务 4: 收口验证与真实视觉检查
  - files: 测试或文档按结果补充
  - tests: `pnpm typecheck:web`, `pnpm harness:check`, 目标 renderer tests; 若改动影响更广再跑 `pnpm test`
  - verify: Electron 实测会话列表 -> 会话详情 header 高度不抖动; 侧栏全局搜索与顶部局部搜索样式一致; 搜索弹窗输入 HeroUI 样式正常; 提交前 `git diff --cached` 只含本任务文件。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

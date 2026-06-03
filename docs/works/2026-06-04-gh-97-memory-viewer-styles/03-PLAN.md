# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] 任务 1: 抽出共享文件查看器与通用按钮, 保留现有资产原文入口行为
  - tests: `pnpm exec vitest run tests/renderer/inspector-drawer.test.tsx tests/renderer/view-raw-button.test.tsx`
  - verify: Windows 右上窗口按钮层级不被抽屉遮住; macOS traffic-light 顶部命中区不被 backdrop 覆盖; copy/close/Escape/Tab/loading/unavailable 保持。
- [ ] 任务 2: 记忆页标签筛选默认一行, hover/focus 浮层展示全量标签并允许滚动
  - tests: `pnpm exec vitest run tests/renderer/memory-view.test.tsx`
  - verify: 标签区域默认一行不挤压卡片; 浮层使用 popover 样式、max-height、overflow-y-auto; active tag 状态一致。
- [ ] 任务 3: 记忆条目的“查看原始文件”复用通用文件按钮, 并完成 renderer/typecheck/harness 验证
  - tests: `pnpm exec vitest run tests/renderer/memory-view.test.tsx tests/renderer/inspector-drawer.test.tsx tests/renderer/view-raw-button.test.tsx`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-97-memory-viewer-styles`
  - verify: 记忆条目打开文件查看器内容与旧行为一致; 相关文件查看入口都走共享按钮 / 抽屉; 无新增 IPC 契约。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

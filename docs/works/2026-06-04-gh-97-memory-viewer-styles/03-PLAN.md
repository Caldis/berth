# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 抽出共享文件查看器与通用按钮, 保留现有资产原文入口行为
  - tests: `pnpm exec vitest run tests/renderer/inspector-drawer.test.tsx tests/renderer/view-raw-button.test.tsx`
  - verify: Windows 右上窗口按钮层级不被抽屉遮住; macOS traffic-light 顶部命中区不被 backdrop 覆盖; copy/close/Escape/Tab/loading/unavailable 保持。
- [x] 任务 2: 记忆页标签筛选默认一行, hover/focus 浮层展示全量标签并允许滚动
  - tests: `pnpm exec vitest run tests/renderer/memory-view.test.tsx`
  - verify: 标签区域默认一行不挤压卡片; 浮层使用 popover 样式、max-height、overflow-y-auto; active tag 状态一致。
- [x] 任务 3: 记忆条目的“查看原始文件”复用通用文件按钮, 并完成 renderer/typecheck/harness 验证
  - tests: `pnpm exec vitest run tests/renderer/memory-view.test.tsx tests/renderer/inspector-drawer.test.tsx tests/renderer/view-raw-button.test.tsx`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-97-memory-viewer-styles`
  - verify: 记忆条目打开文件查看器内容与旧行为一致; 相关文件查看入口都走共享按钮 / 抽屉; 无新增 IPC 契约。

## implement 证据
- `pnpm exec vitest run tests/renderer/inspector-drawer.test.tsx tests/renderer/view-raw-button.test.tsx tests/renderer/memory-view.test.tsx` 通过: 3 files, 20 tests。
- `pnpm typecheck:web` 通过。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- `pnpm lint` 通过。
- `pnpm typecheck` 通过。
- `pnpm test` 通过: 86 files, 630 tests。首次全量测试遇到 GH-96 并行改动中间态导致 `window-controls.test.tsx` 失败; GH-96 文件更新完成后单测与全量测试均通过, 未改动 GH-96 文件。
- `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --project=electron` 通过: 3 tests, 包含 Windows 真实 OS 鼠标点击命中。
- `pnpm harness:check` 与 `pnpm harness:check --work docs/works/2026-06-04-gh-97-memory-viewer-styles` 通过。
- `node scripts/harness-projects.mjs check --strict --work docs/works/2026-06-04-gh-97-memory-viewer-styles` 通过。全局 `node scripts/harness-projects.mjs check --strict` 当前被 GH-90 的 Project debt 字段 mismatch 阻塞, 与 GH-97 无关。
- `pnpm harness:ci:baseline` 未通过: 远端最新 CI run `CI#26897393226` 在 SHA `04ebf40` 为 failure, 当前不推送。
- 视觉实测: agent-owned Electron `gh97-memory-viewer`, debug port 9337。标签默认行高 32px, `overflow:hidden`, hover 浮层 320px 高、`overflow-y:auto`, scrollHeight 641 > clientHeight 319。文件查看器 Windows header 带 `pr-48`; 抽屉关闭按钮 right=1088, window controls left=1105.6, 不重叠; 左侧 resize handle 拖曳后宽度从 672px 变为 796px。截图: `C:\Users\mail\AppData\Local\Temp\berth-agent-dev\gh97-memory-viewer\screenshot.png`。

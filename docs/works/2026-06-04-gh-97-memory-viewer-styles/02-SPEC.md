# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不改主进程、preload 或 shared IPC 类型。

- 资产原文: 继续通过 `window.api.assets.get(asset.id)` 读取 `Asset.raw`。
- 记忆正文: 继续通过 `window.api.memory.get(note.id)` 读取 `MemoryNote.body`。本任务不扩大为读取完整 markdown frontmatter。
- 文件查看器状态: 继续复用 `useAppStore.inspectorOpen/path/content`; 抽屉 UI 从 layout 组件拆到 shared 组件, store 契约不变。

## 任务分类与 debt
- type / maintenance.subtype: `bug`; 不适用 maintenance subtype。
- source.kind / refs: `github-issue`, `GH-97`。
- debt.estimate: 保持 `incurred=5, net=5, scope=cross-process, risk=medium, areas=[ui-ux, architecture]`。
- debt.final 预期: 实现后 UI debt repaid 约 2, 但 verify 前再按实际改动填写。
- revisions: design 后不需要修正。
- Project 字段同步: 已由 `node scripts/harness-projects.mjs ensure docs/works/2026-06-04-gh-97-memory-viewer-styles` 回写 Project item。
- `pnpm harness:stats`: total=21, status=notice, 可以继续当前 bug 修复。

## 模块结构 / 组件拆分
1. `src/renderer/src/components/shared/file-viewer-drawer.tsx`
   - 新增共享文件查看抽屉组件。
   - 负责: backdrop、平台安全区、header、复制、关闭、focus trap、宽度拖曳、内容滚动。
   - Windows: 抽屉 z-index 低于 `WindowControls`, header 右侧预留空间。
   - macOS: backdrop 顶部留出 traffic-light 命中区。
2. `src/renderer/src/components/shared/file-viewer-button.tsx`
   - 新增通用“打开文件查看器”按钮, 接受 `path`, `loadContent`, `label`, `className`。
   - 负责 loading / unavailable 状态和调用 `openInspector(path, content)`。
3. `src/renderer/src/components/shared/view-raw-button.tsx`
   - 保留现有 public API, 内部改为复用 `FileViewerButton`。
4. `src/renderer/src/components/layout/inspector-drawer.tsx`
   - 作为 store adapter 保留, 渲染共享 `FileViewerDrawer`。
5. `src/renderer/src/components/memory/memory-view.tsx`
   - 标签筛选支持 collapsed one-line + hover/focus popover。
   - 记忆条目的查看文件按钮改为复用 `FileViewerButton`。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 标签默认一行; 全量标签只在浮层内出现; 文件查看器是右侧抽屉 | renderer test 检查默认行和 popover; 视觉实测 |
| 组件选择 / 设计系统一致性 | 使用现有 chip、border、popover/background token; 文件按钮继续 lucide Eye | renderer test + 代码审查 |
| 交互反馈 / 状态切换 | hover/focus 打开标签浮层; 文件查看器 copy/close/drag 有反馈 | renderer test 覆盖 |
| loading / empty / error / disabled / focus | `FileViewerButton` 保留 loading/unavailable; `FileViewerDrawer` 保留 close 初始 focus 和 Tab trap | 现有 view raw / inspector 测试扩展 |
| 响应式 / 可访问性 / 键盘可达 | 浮层 max-height 可滚动; 抽屉宽度 clamp; resize handle 有 separator; Escape 可关闭 | renderer test 覆盖 |
| 文案 / i18n / 数字和路径格式 | 新增 resize aria label; 路径仍用 `truncatePath`; 原文不可用文案不变 | en/zh i18n + renderer test |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 标签默认一行、hover/focus 浮层、过滤仍有效 | renderer | `tests/renderer/memory-view.test.tsx` | `pnpm exec vitest run tests/renderer/memory-view.test.tsx` |  |
| 文件查看器共享抽屉的 Windows/macOS 安全区、focus trap、复制、拖曳宽度 | renderer | `tests/renderer/inspector-drawer.test.tsx` | `pnpm exec vitest run tests/renderer/inspector-drawer.test.tsx` |  |
| 资产原文按钮复用通用文件按钮, loading/unavailable 保持 | renderer | `tests/renderer/view-raw-button.test.tsx` | `pnpm exec vitest run tests/renderer/view-raw-button.test.tsx` |  |
| 类型和 harness 约束 | typecheck/harness | n/a | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-97-memory-viewer-styles` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 标签筛选 collapsed + popover | 1, 2 |
| `FileViewerDrawer` 平台安全区 + focus trap + copy/close | 4, 5, 8 |
| `FileViewerButton` / `ViewRawButton` 复用 | 3, 6, 8 |
| 抽屉宽度拖曳 | 7 |
| 测试矩阵与 typecheck/harness | 1-8 |

# Design - 搜索快捷键区分

## 数据契约

本任务不改 IPC、asset model、store 数据结构或页面数据 hook。变更只发生在 renderer layout/search 层:

- 全局搜索快捷键: Ctrl+K / Cmd+K, 入口为侧栏搜索按钮和全局 SearchDialog。对应 AC-1、AC-3、AC-5。
- 页面内搜索快捷键: Ctrl+Shift+K / Shift+Cmd+K, 入口为顶部 header 搜索输入框。对应 AC-2、AC-3、AC-4。
- 快捷键文案在 `search-control.tsx` 中分成 global/page 两个 helper, 调用方按入口语义选择。对应 AC-3。
- `PageChromeProvider` 的页内搜索 focus 注册继续保留, 但全局 SearchDialog 不再把 Ctrl/Cmd+K 转交给页内搜索。对应 AC-1、AC-2。

## 任务分类与 debt

- type: `bug`, 由用户指出两个搜索入口快捷键冲突。
- source.kind: `user-request`, GitHub Issue #130。
- debt.estimate: 维持 `net=2`, `scope=module`, `risk=medium`, `areas=[ui-ux,testability]`。影响集中在 renderer layout 组件和现有 renderer 测试, 不涉及主进程或扫描运行时。
- debt.final 预期: 实现后不新增结构性 debt, 测试覆盖冲突行为后 `repaid=2`, `net=0`。
- revisions: 暂无。`pnpm harness:stats` 显示总 debt=10, 不需要 override。
- Project 字段同步: 任务已在 Project 6 追踪, 当前状态 In Progress。

## 模块结构 / 组件拆分

遵守 `docs/ARCHITECTURE.md` 的 renderer 边界: 页面和 layout 组件只改 React UI 层, 不触碰 preload/main/shared IPC。

- `src/renderer/src/components/layout/search-control.tsx`
  - 增加 `globalSearchShortcutLabel(isMac)` 和 `pageSearchShortcutLabel(isMac)`。
  - 保留原有搜索输入/按钮样式, 不改 HeroUI 组件层级。
- `src/renderer/src/components/layout/sidebar.tsx`
  - 侧栏全局搜索继续使用 global label。
- `src/renderer/src/components/layout/search-dialog.tsx`
  - 全局 SearchDialog 只响应不带 Shift/Alt 的 Ctrl/Cmd+K。
  - 移除 Ctrl/Cmd+K 先 focus 页内搜索的分支。
- `src/renderer/src/components/layout/top-navigation.tsx`
  - header 页内搜索使用 page label。
  - 在存在 `pageChrome.search` 时监听 Ctrl/Cmd+Shift+K, 调用已注册的页内搜索 focus handler。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增控件, 只替换 header 搜索输入框右侧的快捷键文案。 | renderer 测试断言 header 搜索仍渲染, 快捷键文本变为页内搜索组合键。 |
| 组件选择 / 设计系统一致性 | 继续使用 `ChromeSearchInput`、`SearchTriggerButton` 和 `Kbd`; 不绕过 HeroUI primitive。 | 代码审查确认 import 和组件结构未偏离现有 layout。 |
| 交互反馈 / 状态切换 | Ctrl/Cmd+K 打开全局弹窗; Ctrl/Cmd+Shift+K focus/select 页内输入框, 不打开弹窗。 | renderer 测试覆盖两个键盘路径。 |
| loading / empty / error / disabled / focus | 不改加载/空/错误态; focus 行为沿用已有 `focusPageSearch`。 | 测试断言触发后 activeElement 指向页内输入框。 |
| 响应式 / 可访问性 / 键盘可达 | 响应式规则不变; aria-label 不拼接快捷键; 键盘路径变为两个互不冲突的组合键。 | renderer 测试覆盖快捷键; 手工或自动实测确认键盘可达。 |
| 文案 / i18n / 数字和路径格式 | 只改快捷键标签, 不新增 i18n 文案。 | 测试断言 Mac/非 Mac 标签格式。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 全局搜索 Ctrl/Cmd+K 不再被页内搜索截获 | renderer | `tests/renderer/top-navigation.test.tsx` | `pnpm vitest run tests/renderer/top-navigation.test.tsx` | 不适用 |
| 页内搜索 Ctrl/Cmd+Shift+K focus/select header 输入框 | renderer | `tests/renderer/top-navigation.test.tsx` | `pnpm vitest run tests/renderer/top-navigation.test.tsx` | 不适用 |
| header 搜索快捷键文案与全局搜索文案区分 | renderer | `tests/renderer/top-navigation-search.test.tsx` | `pnpm vitest run tests/renderer/top-navigation-search.test.tsx` | 不适用 |
| 会话页、记忆页使用新页内搜索快捷键仍可过滤 | renderer | `tests/renderer/sessions-pages.test.tsx`, `tests/renderer/memory-view.test.tsx` | `pnpm vitest run tests/renderer/sessions-pages.test.tsx tests/renderer/memory-view.test.tsx` | 不适用 |
| 全局搜索弹窗自身仍可由 Ctrl/Cmd+K 打开 | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm vitest run tests/renderer/search-dialog.test.tsx` | 不适用 |
| 类型与 harness 结构 | typecheck / harness | TypeScript, harness docs | `pnpm typecheck:web`, `pnpm harness:check --work docs/works/2026-06-13-gh-130-shortcut-conflict-between-searches` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 全局搜索保留 Ctrl/Cmd+K, SearchDialog 不转交页内搜索 | AC-1, AC-5 |
| 页内搜索改为 Ctrl/Cmd+Shift+K 并 focus/select 输入框 | AC-2, AC-4 |
| global/page 快捷键 label helper 分离 | AC-3 |
| renderer 测试覆盖冲突和页面过滤路径 | AC-1, AC-2, AC-4, AC-5 |

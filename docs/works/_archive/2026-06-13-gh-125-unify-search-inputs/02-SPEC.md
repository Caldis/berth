# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不改 main/preload/IPC/shared 数据契约。

- `PageChromeSearch` 保持现有字段: `value`, `onValueChange`, `placeholder`, `ariaLabel?`。顶部导航只替换渲染组件, 页面调用方不需要改契约。
- 全局搜索仍使用 `useAppStore.searchOpen` / `setSearchOpen` 控制弹窗开关, `window.api.assets.search(query)` 数据链路不变。
- i18n 增加通用局部筛选文案 `search.filterPlaceholder = "Filter {{target}}..." / "筛选{{target}}…"`, 用于 Instructions / Capabilities 这类 tab 标题驱动的页面搜索。
- `memory.searchPlaceholder` 改为 `Filter memories...` / `筛选记忆…`, 保持 key 不变以减少消费方变更。
- `search.placeholder` 继续表示全局搜索资产: `Search assets...` / `搜索资产…`。

## 任务分类与 debt
- type / maintenance.subtype: feature / 不适用。
- source.kind / refs: user-request, https://github.com/Caldis/berth/issues/125。
- debt.estimate: incurred 5, repaid 2, net 3, scope module, risk medium, areas ui-ux + testability, confidence medium。
- debt.final 预期: 若实现未扩散到 IPC/main, 预计 final 与 estimate 一致; 共享搜索控件会偿还当前三处样式分叉。
- revisions: Explore 已记录一次, Design 阶段不再修正。
- Project 字段同步: GH-125 已加入 Project 6, item status 为 In Progress。
- `pnpm harness:stats`: total debt 16, 未触发非 maintenance 阈值说明要求。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

新增 `src/renderer/src/components/layout/search-control.tsx`:

- `ChromeSearchInput`: 基于 `@/components/ui` 的 HeroUI `Input` 和 `Kbd`。默认 36px 标题栏密度, 支持 `density="chrome" | "dialog"`。保留 `ref<HTMLInputElement>`、`value`、`onValueChange`、`placeholder`、`ariaLabel`、`shortcutLabel`、`autoFocus`。
- `SearchTriggerButton`: 基于 `@/components/ui` 的 HeroUI `Button` 和 `Kbd`。用于侧栏全局搜索入口, 语义仍是 button, 视觉与 `ChromeSearchInput` 共用图标、圆角、边框、高度和快捷键提示。
- `searchShortcutLabel(isMac)`: 统一 Ctrl/⌘K 文案, 避免 TopNavigation、Sidebar、SearchDialog 各自拼字符串。

修改点:

- `top-navigation.tsx`: 用 `ChromeSearchInput` 替换内联 `Input`; header 从 `min-h-[72px]` 收敛为固定 `h-[72px] min-h-[72px] max-h-[72px] overflow-hidden`; 右侧操作区改为不换行, 通过 `min-w-0`、`truncate`、搜索宽度约束处理溢出。
- `sidebar.tsx`: 用 `SearchTriggerButton` 替换手写全局搜索按钮; collapsed 时保留方形图标按钮, expanded 时显示 placeholder + Kbd。
- `search-dialog.tsx`: 用 `ChromeSearchInput density="dialog"` 替换原生 `input`; 保留现有 dialog、focus trap、结果键盘导航; show 动画与设置弹窗对齐为 backdrop blur + crossfade, 面板淡入并轻微 zoom。
- `instructions.tsx` / `capabilities.tsx`: 局部搜索 placeholder 改用 `t('search.filterPlaceholder', { target: title })`。
- `memory-view.tsx` 和 locale: 改为 `Filter memories...` / `筛选记忆…`。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 顶部 header 固定 72px; 左侧标题区和右侧操作区同一行居中; 右侧不 wrap 撑高。 | renderer test 检查 header 固定高度类名; 视觉验证会话列表 -> 详情无高度抖动。 |
| 组件选择 / 设计系统一致性 | 搜索 input 使用 HeroUI `Input`; 全局搜索入口用 HeroUI `Button`; 均从 `@/components/ui` 引入。 | grep 确认无新增 `@heroui/react` 直接 import; tests 确认 textbox/button 语义仍正确。 |
| 交互反馈 / 状态切换 | 共享 hover/focus ring、border、shortcut kbd; 侧栏点击打开全局搜索; 弹窗输入保持自动聚焦; 搜索弹窗 show 使用背景 blur 和 crossfade。 | `sidebar-agent-view.test.tsx`, `search-dialog.test.tsx`, 手动/截图检查 hover/focus/弹窗 show。 |
| loading / empty / error / disabled / focus | 搜索弹窗 loading/empty/error 结果区不改; 页面搜索 Ctrl/⌘K 聚焦并全选。 | `search-dialog.test.tsx`, `top-navigation-search.test.tsx`, `top-navigation.test.tsx`。 |
| 响应式 / 可访问性 / 键盘可达 | 侧栏入口保留 button aria-label; 页面搜索保留 textbox aria-label; Ctrl/⌘K 局部优先, 无局部搜索时全局弹窗。 | `top-navigation.test.tsx`, `search-dialog.test.tsx`, `memory-view.test.tsx`。 |
| 文案 / i18n / 数字和路径格式 | 全局搜索继续“搜索资产”; 局部搜索改为“筛选{当前页面内容}”; 英文对应 `Filter ...`。 | instructions/capabilities/memory/sessions 相关 renderer tests; grep 不再出现 `Search assets... Skills`。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 共享标题栏搜索控件和固定 header 高度 | renderer | `tests/renderer/top-navigation-search.test.tsx`, `tests/renderer/top-navigation.test.tsx`, `tests/renderer/app-layout.test.tsx` | `pnpm exec vitest run tests/renderer/top-navigation-search.test.tsx tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx` | — |
| 侧栏全局搜索入口改用 HeroUI Button | renderer | `tests/renderer/sidebar-agent-view.test.tsx` | `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx` | — |
| 全局搜索弹窗输入改用 HeroUI Input | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm exec vitest run tests/renderer/search-dialog.test.tsx` | — |
| 局部搜索 placeholder 修正 | renderer | `tests/renderer/instructions-guidance.test.tsx`, `tests/renderer/capabilities-guidance.test.tsx`, `tests/renderer/memory-view.test.tsx`, `tests/renderer/sessions-pages.test.tsx` | `pnpm exec vitest run tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/memory-view.test.tsx tests/renderer/sessions-pages.test.tsx` | — |
| 类型、harness、集成回归 | typecheck / harness / renderer | 全仓 | `pnpm typecheck:web`, `pnpm harness:check`, 目标 vitest 组合 | — |
| 视觉: 标题栏高度和搜索样式 | manual / screenshot | Electron 实测窗口 | `pnpm dev:agent start --id gh-125-search-chrome --debug-port <port> --json` 后实测截图 | jsdom 无布局高度; 需要真实 Electron 观察抖动和样式。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `ChromeSearchInput` / `SearchTriggerButton` 共享组件 | AC1, AC4 |
| Ctrl/⌘K 注册顺序保持局部搜索优先 | AC2 |
| placeholder i18n 修正 | AC3, AC4, AC7 |
| TopNavigation 固定 72px 且右侧不 wrap | AC5, AC6 |
| 页面无搜索例外和权限页行为不变 | AC7 |

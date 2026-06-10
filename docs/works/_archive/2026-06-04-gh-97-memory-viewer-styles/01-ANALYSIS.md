# 需求分析 (Explore 产物)

## 现状理解
这是 renderer 层 UI 缺陷, 不改主进程扫描或 IPC 契约。

- 记忆页入口: `src/renderer/src/pages/instructions.tsx` 在 `activeTab === 'memories'` 时渲染 `MemoryView`。
- 记忆数据: `MemoryView -> useMemory() -> window.api.memory.list/get -> src/main/memory`。列表只带元数据; 展开或查看文件时再按需读取 body。
- 标签筛选: `MemoryView` 内 `FilterGroup` 直接 `flex-wrap` 渲染全部标签。标签数量多时, 筛选区会多行占位, 挤压下面的记忆卡片。
- 原始文件查看: 全局 `InspectorDrawer` 挂在 `AppLayout` 下, 状态存在 `useAppStore` 的 `inspectorOpen/path/content`。资产页用 `ViewRawButton`; 记忆页绕过该共享按钮, 在 `NoteCard.viewRaw()` 中直接 `openInspector(note.path, text)`。
- 窗口控件: Windows 自定义控件 `WindowControls` 固定在右上角 `z-[10000]`; 当前 `InspectorDrawer` 是 `fixed right-0 top-0 z-50`, 顶部按钮没有给 Windows 控件预留右侧空间。macOS 使用原生 traffic-light, `BrowserWindow` 设了 `titleBarStyle: hiddenInset` 与 `trafficLightPosition: { x: 16, y: 16 }`; 全屏 backdrop / 顶部面板不应覆盖这块命中区。

## 关联与依赖
- `src/renderer/src/components/memory/memory-view.tsx`: 标签筛选、记忆卡片详情、记忆文件查看入口。
- `src/renderer/src/components/shared/view-raw-button.tsx`: 资产原始内容按钮, 当前只接受 `Asset`。
- `src/renderer/src/components/layout/inspector-drawer.tsx`: 文件查看抽屉 UI、复制、关闭、focus trap。
- `src/renderer/src/components/layout/window-controls.tsx`: Windows 顶部自定义按钮, 必须继续保持最高点击层。
- `src/renderer/src/styles/globals.css`: 只有 `titlebar-drag` / `titlebar-no-drag` 两类窗口命中区域。
- 相关测试: `tests/renderer/memory-view.test.tsx`, `tests/renderer/inspector-drawer.test.tsx`, `tests/renderer/view-raw-button.test.tsx`。

## 任务分类与 debt 校准
- type / maintenance.subtype: `bug`; 不适用 maintenance subtype。
- source.kind / refs: `github-issue`, `GH-97`。
- debt estimate 修正: 初估仍成立。该任务会把已有抽屉拆成共享文件查看组件, 但不改变 IPC 和扫描模型。
- scope / risk / areas / confidence: `cross-process` 是保守写法, 实际实现集中在 renderer; risk=medium, areas=`ui-ux, architecture`, confidence=medium。
- revision: 无。
- `pnpm harness:stats`: total=21, status=notice, 未达到 recommend-maintenance 阈值。

## 验收标准
1. 记忆页标签筛选默认只占一行; 标签过多时不挤压下方内容。
2. hover 或键盘 focus 到标签区域时, 通过浮层展示全部标签; 浮层可滚动, 且不会改变页面正常布局高度。
3. 点击记忆条目的“查看原始文件”仍可打开右侧文件查看器, 内容与现有行为一致。
4. Windows 下文件查看器顶部操作按钮不与自定义窗口按钮重叠; 窗口按钮保持可点击。
5. macOS 下打开文件查看器时, 原生 traffic-light 区域不被网页 backdrop 或面板覆盖。
6. 文件查看器抽成共享组件; 资产原文入口和记忆文件入口都复用同一套按钮 / 抽屉行为。
7. 文件查看器支持从左边缘拖曳调整宽度, 且宽度有最小 / 最大限制。
8. 复制、关闭、Escape、Tab focus trap、加载中、不可用状态保持可用。

## 界面质量与交互验收
- 页面结构: 记忆页顶部是来源筛选、重要性筛选、标签筛选, 下方是记忆卡片列表。标签数量会远多于其他筛选。
- 设计系统: 当前使用 Tailwind utility、圆角边框 chip、lucide 图标、shadcn 风格颜色 token。新增浮层和抽屉应继续使用 `border`, `bg-popover/background`, `text-muted-foreground`, `focus-visible:ring`。
- 信息密度: 标签默认一行, 不让筛选区成为主内容; 展开态只在用户 hover/focus 时出现。
- 用户路径: 过滤标签、展开记忆、查看原始文件、复制内容、关闭文件查看器、拖宽/缩窄查看器。
- 可见状态: 标签筛选 active 态、浮层 hover/focus 态、文件查看器 open/closed、复制成功、拖曳中。
- 交互反馈: 按钮 hover/focus, 浮层阴影与边框, 拖曳时 cursor/user-select。
- 响应式: 抽屉宽度不能超过 viewport; 标签浮层宽度跟随内容区, max-height 使用视口比例。
- 可访问性风险: 浮层需可通过 focus 打开; 抽屉继续 `role=dialog`, `aria-modal`, Tab 留在抽屉内; resize handle 需有 `separator` 语义与 aria-label。

## 未决问题
无需要用户澄清的问题; 方案可直接进入 design。

# 需求分析 (Explore 产物)

## 现状理解
本任务只涉及 Electron renderer 的导航 chrome 和搜索 UI, 不改 main/preload/IPC 数据契约。`docs/ARCHITECTURE.md` 约定页面和共享组件只能从 `@/components/ui` 取设计系统 primitive, 不能直接 import `@heroui/react`; 当前 `components/ui/index.ts` 已 re-export `Input`、`Button`、`Kbd` 等 HeroUI primitive。

已确认的真实入口:

- 顶部页面内搜索: `src/renderer/src/components/layout/top-navigation.tsx` 已使用 `Input` + `Kbd`, 由 `PageChromeSearch` 提供 `value` / `onValueChange` / `placeholder` / `ariaLabel`。
- 侧栏全局搜索入口: `src/renderer/src/components/layout/sidebar.tsx` 仍是手写 `button` + 原生 `kbd`, 视觉上像输入框, 但不是 HeroUI primitive。
- 全局搜索弹窗输入: `src/renderer/src/components/layout/search-dialog.tsx` 仍是原生 `input`, 快捷键 Ctrl/⌘K 在这里统一监听。
- 页面 placeholder 异常: `instructions.tsx` 与 `capabilities.tsx` 使用 `${t('search.placeholder')} ${title}`, 会生成 `Search assets... Skills` / `搜索资产… 约定` 这类全局搜索文案拼局部标题的错误结果。
- 记忆页局部搜索: `memory-view.tsx` 当前是 `Search memories...` / `搜索记忆…`, 不符合本次“筛选{当前页面内容}…”规则。
- 会话列表局部搜索: `sessions.tsx` 已是 `Filter sessions...` / `筛选会话…`, 文案方向正确。
- 标题栏高度: `top-navigation.tsx` 只设置 `min-h-[72px]` 和 `py-3`, 右侧操作区允许 `flex-wrap`; 当会话列表页有搜索/帮助/状态占位, 而详情页改为返回按钮 + 嵌套面包屑时, 实际内容高度可能超过或低于 72px, 解释了用户观察到的轻微抖动。

## 关联与依赖
快捷键链路:

- `SearchDialog` 监听 Ctrl/⌘K。
- 监听到快捷键后先调用 `focusPageSearch()`。
- `TopNavigation` 只有在 `pageChrome.search` 存在时才通过 `useRegisterPageSearchFocus` 注册页面搜索 focus handler。
- 因此当前优先级已经是“页面局部搜索优先, 没有局部搜索才打开全局搜索”; 实现必须保留这个顺序。

HeroUI 依据:

- 官方 HeroUI v2 Input 文档: https://v2.heroui.com/docs/components/input
- 本地安装版本: `@heroui/react@2.8.10`, `@heroui/input@2.4.33`。
- 本地类型确认 `Input` 是 `InternalForwardRefRenderFunction<"input", InputProps>`, `UseInputProps` 支持 `ref?: Ref<HTMLInputElement>`、`startContent`、`endContent`、`classNames`、`onValueChange`。这满足顶部搜索继续通过 ref 执行 `focus()` + `select()` 的需要。

历史上下文:

- GH-109 已把 header 搜索从原生输入迁到 HeroUI `Input`, 并把 `SearchDialog` 的原生输入列为延后项。
- 本任务用户明确点名全局搜索和标题栏局部搜索统一, 所以这次应至少把侧栏全局入口和弹窗真实输入纳入收敛; 否则左侧入口点击后仍进入手写输入框, 样式统一不完整。

作用域边界:

- 不改变搜索数据源、搜索结果排序、路由跳转或资产过滤算法。
- 不改变 `PageChromeSearch` 对外契约, 只收敛渲染组件和文案来源。
- 不把 Permissions 这类没有文本过滤需求的页面强行加搜索框。
- 不顺手重做 SearchDialog 为 HeroUI Modal; 只把输入和键盘提示收敛到 HeroUI primitive, 保留现有 focus trap 与结果键盘导航。

## 任务分类与 debt 校准
- type: feature。
- source.kind / refs: user-request, GitHub Issue https://github.com/Caldis/berth/issues/125。
- debt estimate 修正: incurred 4 -> 5, repaid 1 -> 2, net 3 不变。
- scope / risk / areas / confidence: module / medium / ui-ux + testability / medium。
- revision: Explore 阶段加入“标题栏固定高度”验收; 同时通过共享搜索控件偿还样式重复 debt。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 顶部页面内搜索、侧栏全局搜索入口、全局搜索弹窗输入均经由 `@/components/ui` 的 HeroUI primitive 渲染; 共享同一套搜索图标、边框、圆角、高度、hover/focus 和快捷键提示样式。
2. Ctrl/⌘K 不冲突: 当前页面注册局部搜索时, 快捷键聚焦并全选局部搜索输入, 不打开全局搜索弹窗; 没有局部搜索时, 快捷键打开全局搜索弹窗。
3. 局部搜索 placeholder 统一为“筛选{当前页面内容}…”语义; 英文为 `Filter {current page content}...`。不得再出现 `Search assets... Skills`、`搜索资产… 约定` 这类全局搜索文案拼接页面标题的结果。
4. 全局搜索保留“搜索资产…”语义, 因为它跨页面搜索资产而不是筛选当前页面内容。
5. 会话列表进入会话详情、团队页与其他页面之间切换时, 顶部导航栏占用高度保持一致; 长标题、局部搜索和右侧操作不能让 header 自增高。
6. 顶部右侧操作优先级保持既有顺序: 页面操作、页面搜索、页面说明; 页面说明按钮仍靠右, 不干扰主要操作。
7. Permissions 等没有局部文本筛选的页面继续不显示局部搜索。

## 界面质量与交互验收
当前页面结构是左侧固定 sidebar + 顶部 `TopNavigation` + 独立滚动内容区。搜索控件位于高频路径: 侧栏全局搜索用于跨资产跳转, 顶部局部搜索用于当前页面过滤。二者必须看起来同属一套控件, 但文案要明确区分“搜索全局资产”和“筛选当前页内容”。

设计系统用法:

- 新增/复用共享搜索控件时从 `@/components/ui` import `Input` / `Button` / `Kbd`。
- 页面组件不直接接触 `@heroui/react`。
- 搜索高度以 36px 为标题栏密度基准; 弹窗输入可用同一组件的 taller 配置, 但仍走同一 primitive 和 slot class。

交互与可访问性:

- 页面搜索 input 保留 `aria-label`、placeholder、受控 value、`onValueChange`、ref focus/select。
- 侧栏入口语义仍应是 button, 因为它打开全局搜索弹窗, 不是在侧栏内直接输入; 可用 HeroUI `Button` 做触发器, 视觉匹配搜索输入。
- 全局搜索弹窗的真实输入应是 HeroUI `Input`, 保留 autoFocus、Tab trap、ArrowUp/ArrowDown/Enter 结果选择、Escape 关闭。
- 标题栏固定高度后, 右侧操作区不能 wrap 撑高; 溢出时应优先截断标题和收缩搜索宽度, 不让高度变化。

测试入口:

- `tests/renderer/top-navigation-search.test.tsx`: 页面搜索 HeroUI 输入、placeholder、onValueChange、快捷键 focus/select。
- `tests/renderer/top-navigation.test.tsx`: 搜索和帮助按钮顺序、Ctrl/⌘K 优先局部搜索、标题栏固定高度类名。
- `tests/renderer/sidebar-agent-view.test.tsx`: 侧栏全局搜索入口打开弹窗、Project scope 顺序。
- `tests/renderer/search-dialog.test.tsx`: 全局搜索弹窗输入、focus trap、结果键盘导航。
- `tests/renderer/instructions-guidance.test.tsx`、`capabilities-guidance.test.tsx`、`memory-view.test.tsx`、`sessions-pages.test.tsx`: 页面 placeholder 与过滤行为。

## 未决问题
留给 design 向人澄清。
无。按当前需求直接设计与实现。

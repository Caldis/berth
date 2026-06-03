# 需求分析 (Explore 产物)

## 现状理解
涉及的进程 / 模块 / IPC 契约 (参 docs/ARCHITECTURE.md)。

- 范围集中在 Electron renderer: `src/renderer/src/components/layout/app-layout.tsx`, `top-navigation.tsx`, `sidebar.tsx`, `nav-config.ts`, 以及 `pages/{sessions,session-detail,instructions,capabilities,usage}.tsx`。
- `AppLayout` 当前结构为 `main.overflow-auto` 内部渲染 `TopNavigation` 与页面内容。顶部导航属于同一个滚动容器, 会参与滚动条高度计算。
- `TopNavigation` 当前只根据 `findNavMatch()` 显示父级 section label。功能页标题仍在页面内容里, 所以截图中出现顶部仅有“工作/会话/能力”等分类, 页面名称在内容区下沉。
- 总览页 `/` 当前也渲染空的 `TopNavigation` header。由于没有 breadcrumb, header 仍保留 `h-11` 与边框, 与用户期望不符。
- 搜索入口当前位于 `Sidebar`。页面内搜索和筛选分布在 `Sessions`, `Instructions`, `Capabilities`, `Usage` 内容区。页面说明使用 `FeatureGuidePanel` 卡片呈现在内容区。
- Session 详情页在内容区自建返回按钮、面包屑文字和标题。顶部导航未承载详情页标题, 也未包含返回动作。
- 现有测试 `tests/renderer/top-navigation.test.tsx` 明确要求顶部导航不要重复页面标题, 与本需求相反, 必须更新。

## 关联与依赖
调用关系、region/scope 差异、历史设计取舍。

- `nav-config.ts` 是侧栏导航与顶部导航共同信息源。可在这里扩展 route metadata: section label, page label, active item, detail route 行为。
- `TopNavigation` 依赖 `useLocation()` 与 i18n。详情页标题需要从页面数据产生, 不适合只靠 route 静态配置; 需要页面向布局层提供标题与动作。
- `SearchDialog` 由 `useAppStore().setSearchOpen` 控制。侧栏主搜索入口保留为全局资产搜索; 顶部导航搜索是页面级受控输入, 随当前页面切换 placeholder/value/onChange。用户澄清的“搜索上移”指页面内部搜索/筛选控件迁移到顶部导航, 不包括移除侧栏搜索。
- `FeatureGuidePanel` 目前含展开状态和证据标签。若“页面说明提示”移到顶部导航, 应复用同一信息模型, 使用顶部帮助弹出/内联摘要, 避免内容区继续展示大说明卡片。
- `FilterBar` 是 Instructions/Capabilities 的页面内搜索+scope 控件。Sessions 使用自建筛选和分组控件。Usage 使用时间范围和 cost mode 控件。顶部导航需要支持页面级 actions slot, 不应把所有页面控件强行统一成同一个组件。
- Overview 是 dashboard 首屏, 保留自身 hero 和状态摘要即可; 顶部导航应隐藏, 内容滚动区从页面顶部开始。

## 任务分类与 debt 校准
- type / maintenance.subtype:
  - type: feature
  - maintenance.subtype: 不适用
- source.kind / refs:
  - source.kind: user-request
  - refs: GH-90
- debt estimate 修正:
  - 0.0-new 估算仍成立: incurred 5, repaid 0, net 5。
- scope / risk / areas / confidence:
  - scope: global。影响 AppLayout、TopNavigation 与多功能页。
  - risk: medium。风险在于布局滚动、titlebar drag 区域、详情页数据标题、现有测试期望反转。
  - areas: ui-ux, architecture。
  - confidence: medium。源码显示影响面明确, 仍需设计阶段确定顶部 slot API。
- revision:
  - 无。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. `/` 总览页不渲染 `data-testid="top-navigation"`; 内容不被顶部空白导航占位。
2. 功能页顶部导航高度高于现有 `h-11`, 固定在主内容区顶部, 内容滚动容器独立位于导航下方。
3. 功能页顶部导航同时显示分类与页面名称, 例如“工作 / 会话”“指令 / Skills”“能力 / Hooks”“运行 / 用量”。
4. 侧栏主搜索入口保留并打开全局 `SearchDialog`; 顶部导航搜索为页面级输入, 例如 Memories 显示“Search memories...”; 页面内部搜索栏移除; `Ctrl/⌘K` 在有页面搜索时聚焦页面搜索, 否则打开全局搜索。
5. Sessions 的筛选、分组、刷新/分批渲染状态迁移到顶部导航 action 区, loading/empty/list 状态仍保留。
6. Instructions 与 Capabilities 的搜索与 scope 筛选迁移到顶部导航 action 区, 内容区不再重复显示页面标题、筛选条和说明卡片。
7. 功能页说明提示通过顶部导航帮助入口展示, 复用原 `FeatureGuidePanel` 的 title、summary、evidence 与 details 信息。
8. Session 详情页顶部导航包含返回按钮、会话列表面包屑与当前 session 标题; 内容区不再重复顶部返回/标题区。
9. 顶部导航在 Windows 下保留窗口按钮预留区域, macOS 下维持 titlebar drag/no-drag 行为。
10. 相关 renderer 单测覆盖导航上下文、总览无导航、详情页返回与页面级 controls; UI 实测截图覆盖 sessions 列表与 session detail。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。

- 设计系统: Tailwind v3 + shadcn/Radix primitives + Lucide icons。项目已安装 `lucide-react`, 未安装 Phosphor icons。现有代码标准化 Lucide, 本任务沿用现有 icon 体系, 不新增 icon 依赖。
- 视觉密度: 当前 dashboard 和列表密度约为 daily app。新导航采用较高但紧凑的两层信息结构: 上层分类/标题/搜索, 下层可选页面 controls。
- 色彩: 当前中性 zinc/slate + 单一 primary, 局部状态色用于风险/状态。不得引入紫蓝渐变、霓虹或大面积单色主题。
- 布局: 主内容区应为 `flex flex-col overflow-hidden`; 顶部导航 `shrink-0`; 页面滚动容器 `flex-1 overflow-auto`。滚动条只属于内容容器。
- 信息层级: 功能页内容区移除重复 `h1` 与说明卡片后, 首屏应显示任务数据本体; 顶部导航承担页面识别与辅助说明。
- 交互反馈: 导航按钮、搜索、筛选、返回、帮助入口需要 focus-visible、hover、active 状态。避免仅靠颜色表示状态。
- Loading/empty/error: 页面原有 loading/empty/error 状态保留。顶部 action 区的 toolbar status 仍使用 `aria-live`。
- 响应式: action 区在窄视口换行或压缩为图标按钮; 长标题截断, 不撑开窗口。
- 可访问性: 顶部导航保留 `aria-label=breadcrumb`; 返回按钮有可读 label; 帮助入口有 dialog/popover 标题; input label 或 aria-label 不缺失。

## 未决问题
留给 design 向人澄清。

- 无需用户澄清。设计阶段可直接在现有信息架构上定义顶部导航上下文 API 与页面迁移方案。

# 需求分析 (Explore 产物)

> 状态: 初步分析已落盘 (基于静态代码阅读)。explore **未收口** — 进 design 前需补两项外部 UI primitive 官方文档验证 (见"未决问题" 1-2, 不变量 9)。

## 现状理解

### 涉及进程 / 模块
纯 renderer (`src/renderer`), 不涉及 main / preload / IPC。设计系统层在 `src/renderer/src/components/ui/`; 折叠动效 token 在 `components/ui/motion.ts`。

### 两种折叠实现对比

**团队页 (有动画 / 布局优雅)** — `pages/teams.tsx:105-124`
- 用 `@/components/ui` 的 `Accordion` / `AccordionItem`, 底层 re-export 自 HeroUI 2.8.10 (`components/ui/index.ts:55-56`)。
- HeroUI Accordion 内部依赖 framer-motion (`package.json`: `framer-motion ^12.40.0`, HeroUI peer dep) 对内容区做 `height: auto` 进入/退出过渡; 指示箭头随展开态旋转。
- `variant="splitted"` 每项独立卡片; `selectionMode="multiple"` 多项可同时展开; `itemClasses={{base,trigger,content}}` 统一三段式布局。

**约定页 (无动画)** — `pages/instructions.tsx`
- `MemoryCard` (65-117) / `SkillCard` (121-220) / `GenericAssetCard` (223-304) 各自手写同一模式:
  - `const [expanded, setExpanded] = useState(false)`
  - `<button onClick={() => setExpanded(!expanded)}>` + `ChevronDown`/`ChevronRight` 两图标瞬间互换 (非旋转)
  - `{expanded && (<div className="border-t ...">…</div>)}` 条件渲染

### 差异根因
`{expanded && ...}` 是 React 条件渲染, 直接 mount/unmount DOM, 无中间插值帧, 浏览器无从过渡 → 无动画。要动画须用 framer-motion `AnimatePresence` 或 CSS `grid-template-rows: 0fr→1fr`, 约定页两者皆无。**差异是技术路线 (设计系统组件 vs 手写条件渲染), 非样式参数。**

## 关联与依赖

### 影响面 (全局粗筛)
手写折叠是全项目普遍模式, 非 instructions 一处:
- `useState` + `expanded/isOpen/collapsed` 命中 11 文件: `search-dialog` / `memory-view` / `capabilities` / `hooks-lifecycle-view` / `project-scope-switcher` / `sidebar` / `feature-guide-panel` / `floating-popover` / `session-replay` / `instructions` / `teams`。
- `{expanded && / isOpen && ...}` 类无动画条件渲染 13 处。
- ⚠ 以上为 grep 粗筛, **design 阶段须逐个甄别**: 部分是 popover/dialog/sidebar 折叠而非行内手风琴, 不一定纳入统一范围。

### 关键架构约束 (已查清)
约定页折叠 card 套在 `VirtualGroupedList` (`instructions.tsx:501`) 内, 底层是 react-virtuoso `GroupedVirtuoso` (`virtual-grouped-list.tsx:9,202`):
- **不能整页换 HeroUI Accordion**: Accordion 自管整组 item 展开状态, 与"虚拟列表只渲染可视区若干独立行"是互斥布局模型; 强行合并 = 放弃虚拟滚动 (assets 量大时全量渲染性能退化)。团队页能用 Accordion 因团队数量少、无需虚拟化 — 两页信息架构本就不同。
- react-virtuoso 原生支持动态高度 (内部 ResizeObserver 自动测量真实行高; `defaultItemHeight=86` 仅首帧估算, `instructions.tsx:521`)。card 展开导致高度变化时虚拟列表自动 re-measure, 无需手动通知 → 支撑共享 Collapsible 方案可行。

### 既有可复用资产
- `components/ui/motion.ts`: `MOTION.duration.base=0.2s`、`MOTION.ease.standard/emphasized` 缓动、`fadeRise` variants、`TRANSITION` 工具串。共享 Collapsible 动效应走这套 token, 与团队页节奏对齐。
- framer-motion 已是直接依赖, 无需新增。

## 任务分类与 debt 校准
- type / maintenance.subtype: **maintenance / ui-ux**
- source.kind / refs: user-request / GH-136
- debt estimate: incurred 2, repaid 5, net -3 (偿还为主)
- scope / risk / areas / confidence: module / medium / [ui-ux] / low
- revision: (无, 0.0-new 初始估算)
- 说明: ui-ux area 当前 debt=18 (`harness:stats`), 本任务定位为偿还折叠一致性债; 风险点在虚拟列表 + 动画交互, 故 risk=medium。

## 候选方案 (design 阶段定稿)
- **方案 A** — 整页换 HeroUI Accordion: 与虚拟滚动架构互斥, **否决**。
- **方案 B (推荐)** — 抽共享 `Collapsible` composite (framer-motion + MOTION token) 于 `components/ui/`; 约定页三 card 迁移并保留 VirtualGroupedList; 后续分批收敛其余手写折叠。风险: 动画期间高频 re-measure 抖动, 需真跑验证 (CDP 时序观察, 不变量 22)。
- **方案 C (备选)** — 纯 CSS `grid-template-rows: 0fr→1fr` 过渡: 零新依赖、改动最小, 但动画表现力弱、grid 过渡对 padding/border 有兼容细节需调。

## 验收标准 (草稿; SPEC 与 verify 据此核对)
1. 新增共享折叠组件于 `components/ui/`, 动效走 MOTION token, 经 `@/components/ui` 单一 import 出口暴露。
2. 约定页 MemoryCard / SkillCard / GenericAssetCard 迁移至共享组件: 展开/收起有高度过渡, chevron 旋转过渡。
3. 保留 VirtualGroupedList; 展开/收起后虚拟列表滚动布局正确无错位 — **真跑 CDP 观察时序, 非仅 unit/CI 静态绿** (不变量 22 + memory `runtime-behavior-needs-real-run`)。
4. 折叠动画时长/缓动与团队页 HeroUI Accordion 一致 (校准 `MOTION.duration.base` 与 HeroUI 默认值)。
5. 其余约 8 处手写折叠的迁移路径在 SPEC/PLAN 写明 (本任务可分批; 至少完成 instructions 三 card)。

## 界面质量与交互验收
- **页面结构**: 约定页 = PageChrome + ScopeFilterChips + VirtualGroupedList(按 scope 分组) + 行内可展开 card; 团队页 = HeroUI splitted Accordion。
- **设计系统用法**: HeroUI primitives 经 `@/components/ui` 统一出口 (`index.ts` 注释明确"never from @heroui/react directly"); motion token 已集中。
- **信息密度**: card 头部 (名称 / ScopeBadge / 路径 / 计数 / PluginOriginBadge) + 展开详情 (DetailRow / tools / imports / 操作按钮)。
- **可见状态**: 须覆盖 展开 / 收起 / focus / hover。迁移**不得破坏 focus 自动展开** (`instructions.tsx:137-139` SkillCard、`237-239` GenericAssetCard: 从插件页跳转时 `setExpanded(true)`)。
- **交互反馈**: chevron 旋转 + 高度过渡。主观视觉 (间距/对齐/动画快慢) 最终由用户裁判 — verify 截图请用户确认再收口 (不变量 22)。
- **可访问性**: 当前手写 card 的展开 button **缺 `aria-expanded`** (对比: teams 的 `TeamMemberRow` prompt 切换在 `teams.tsx:297` 有 `aria-expanded`)。共享组件应内建 `aria-expanded` / `aria-controls`。
- **响应式**: card 头部计数项需保证窄屏不溢出 (teams 头部用 `hidden md:inline-flex` 处理, 共享组件迁移时注意)。

## 未决问题 (explore 收口 / design 澄清)
1. **[explore 待补]** HeroUI 2.8.10 Accordion 的 transition 默认时长 / 缓动 / 是否可配 — 查官方文档 (不变量 9: 外部 UI primitive transition 行为按 SDK 处理, 须查 primary source)。
2. **[explore 待补]** react-virtuoso 动态高度在 framer-motion 连续高度动画下的 re-measure 行为与抖动程度 — 查官方文档, design 评估是否需节流 / 改 opacity-only 过渡 / `increaseViewportBy`。
3. **[design]** 11 文件/13 处中哪些是真行内折叠 (纳入统一) vs popover/dialog/sidebar (排除); 逐个甄别。
4. **[design]** 共享组件 API 形态: 受控 vs 非受控? 是否一并统一 teams 的 HeroUI Accordion (仅对齐 motion token) 还是只收敛手写侧。
5. **[design]** 本任务边界: 用户曾提可先做最小验证 (只改 MemoryCard 一个 card 验证动画 + 虚拟列表高度跟踪) 再铺开 — 确认本任务是"共享组件 + instructions 全量"还是"最小验证切片", 其余分批到 GH-136 后续。

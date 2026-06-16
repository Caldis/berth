# 需求分析 (Explore 产物)

> 状态: **explore 已收口** (含两项官方文档验证 + 符号边界 blast radius 精判 + 一手核实已有实现)。下一步 `harness-2.0-design`。
> ⚠ explore 阶段一手核实**反转了初始方案**: 从"引入 framer-motion 新造" → "提炼项目已有的 grid-rows 折叠范本"。详见 §5-§6。

## 1. 现状理解

### 涉及进程 / 模块
纯 renderer (`src/renderer`), 不涉及 main / preload / IPC。设计系统层 `src/renderer/src/components/ui/`; 折叠动效 token `components/ui/motion.ts` (`MOTION.duration.base=0.2s`, `ease.standard`)。

### 项目里其实有**三种**折叠形态 (非两种)
| 形态 | 代表 | 动画 | 机制 |
|---|---|---|---|
| **成熟组件** | teams 页 `teams.tsx:105-124`、capabilities `PluginCard` | 有 | HeroUI Accordion (framer-motion, height auto) |
| **手写有动画 (已验证范本)** | memory-view `NoteCard` (317-326)、`TagFilter` (591-598) | 有 | **CSS `grid-template-rows: 0fr→1fr` + opacity, `duration-200 ease-out`** |
| **手写无动画 (退化版)** | instructions 三 card、capabilities `McpServerCard` | 无 | `{expanded && <div>}` 条件渲染, 直接 mount/unmount |

> 关键: 第二、三种是**同一作者意图的不同完成度** — 无动画版只是少做了 grid-rows 那一步。capabilities.tsx 内 `McpServerCard`(无动画手写) 与 `PluginCard`(HeroUI Accordion) **并存**, 是"不统一"的铁证。

### 无动画的根因
`{expanded && ...}` 是 React 条件渲染, 直接 mount/unmount DOM, 无插值帧 → 无动画。对照 NoteCard: 内容区**常驻挂载**于 `grid-rows-[0fr]` 容器, 靠 CSS 过渡 `0fr→1fr` 撑开高度, 收起后再延迟卸载 — 这才有动画。

## 2. 外部文档验证结论 (不变量 9, context7 官方文档)

### HeroUI v2 Accordion (`@heroui/react` 2.8.10)
- 动画基于 framer-motion; 经 `AccordionItem.motionProps` (framer variants) 定制 enter/exit, 另有 `disableAnimation` / `disableIndicatorAnimation` / `keepContentMounted` / `hideIndicator`。
- ⚠ **官方文档未公开默认 transition 的时长/缓动数值** — 无法靠读文档让自研组件"精确对齐"HeroUI 默认动画。
- 推论: 统一**不应**逆向 HeroUI 黑盒默认值。手写侧统一到 grid-rows + MOTION token; HeroUI 侧若要对齐, 反向给它传 `motionProps` 收敛到 MOTION token, 残余 height-timing 差异在 verify 实测裁定。(置信度: 机制高 / 默认数值未知)

### react-virtuoso (约定页 VirtualGroupedList 底层)
- 官方明确: *"React Virtuoso automatically handles changes in item heights caused by content resizing... **without requiring any additional configuration**"*; 另有 `items-change` smooth scroll modifier 处理高度变化时的滚动位置修正。
- 推论: card 在虚拟列表内展开/收起 (含动画过程的连续高度变化) 被 ResizeObserver 自动 re-measure, **无需手动通知**。grid-rows (CSS 驱动) 比 framer-motion (JS 每帧改 height) 对 virtuoso 更友好。(置信度: 高)

## 3. blast radius — 符号边界精判 (修正初始 grep 粗筛)

> 初始 0.0-new 用 grep 子串得"11 文件/13 处", 属虚高 (friction `20260606-heroui-migration` 警告)。按 JSX 使用点 + state 真实语义重判后:

**A 类 — 需收敛到共享 Collapsible, 共 6 处 / 4 文件:**
1. `pages/instructions.tsx` — `MemoryCard`(54) / `SkillCard`(123) / `GenericAssetCard`(225), 行内展开资产详情。**均无动画**。
2. `pages/capabilities.tsx` — `McpServerCard`(72), 行内展开 command/env 详情。**无动画**。
3. `components/memory/memory-view.tsx` — `NoteCard`(212), 行内展开 note 详情。**已有 grid-rows 动画 → 作为提炼范本, 迁移后行为不应退化**。
4. `components/shared/feature-guide-panel.tsx` — `FeatureGuidePanel`(22), 行内展开 insights/evidence。待核实动画状态。

**B 类 — 排除 (非行内块级折叠):**
- `teams.tsx` Accordion (已 HeroUI) + `TeamMemberRow.promptExpanded`(262, line-clamp 文本切换, 非块级)
- `capabilities.tsx` `PluginCard` (已 HeroUI Accordion)
- `memory-view.tsx` `TagFilter`(508, grid-rows 标签网格 — 形态是 disclosure 但内容是筛选网格非详情; **作为第二提炼范本参考, 是否纳入由 design 定**)
- `search-dialog`(模态) / `project-scope-switcher`(下拉浮层) / `floating-popover`(浮层) / `sidebar`(整体收起) / `hooks-lifecycle-view`(悬浮 tip + 原生 `<details>`)

## 4. 既有可复用资产
- **`memory-view.tsx` NoteCard / TagFilter**: 生产级 grid-rows 折叠范本 (见 §5)。
- `components/ui/motion.ts`: MOTION token (`duration.base=0.2s` 已等于范本的 `duration-200`)。
- framer-motion 已是依赖 (HeroUI 传递), 但本任务**手写侧无需用它**。

## 5. 关键发现: 项目已有 grid-rows 折叠范本 (方案反转依据)

`NoteCard` (memory-view.tsx:317-326) 已具备生产级折叠组件的全部要素, 共享组件应**提炼它**而非新造:
1. `grid` + `transition-[grid-template-rows,opacity] duration-200 ease-out` + `grid-rows-[0fr]↔[1fr]` 高度过渡。
2. `motion-reduce:transition-none` — 尊重 prefers-reduced-motion。
3. `aria-hidden={!expanded}` + `inert={!expanded}` — 收起时屏蔽辅助技术与交互。
4. `detailsMounted` + 延迟卸载 timer (`DETAILS_COLLAPSE_MS`, 222-270) — 展开即挂载、收起动画播完再卸载; 兼顾懒加载与动画完整。
5. focused 自动展开 + scrollIntoView (273-285)。

两个范本本身也不一致 (NoteCard chevron 图标互换无旋转 / TagFilter `rotate-180` 旋转, 571) — 共享组件应取**两者长处合并**: TagFilter 的 chevron 旋转 + NoteCard 的无障碍/延迟卸载。

## 6. 候选方案 (design 定稿; 已较 0.0-new 反转)

- **方案 C-pro (主推)** — 提炼 NoteCard/TagFilter 的 **CSS grid-rows** 手法为共享 `<Collapsible>` (于 `components/ui/`, 经 `@/components/ui` 出口); 内建 reduced-motion + aria + 延迟卸载 + chevron 旋转, 时长走 MOTION token。6 处 A 类收敛, NoteCard/TagFilter 反向接入。优点: 零新依赖、有已验证范本、对 virtuoso 最友好、视觉天然对齐。
- **方案 B (降级备选)** — framer-motion `AnimatePresence` 新造: 与项目已有范本机制不一致, 徒增 JS 动画开销, 对 virtuoso 不如 CSS 友好。**除非 design 发现 grid-rows 有硬伤, 否则不取**。
- **HeroUI 侧 (teams / PluginCard)**: 不改机制, 仅评估传 `motionProps` 对齐 MOTION token; 优先级低于手写侧收敛。
- **方案 A (整页换 HeroUI Accordion)**: 与虚拟滚动架构互斥, 否决 (不变量见 §2)。

## 7. 任务分类与 debt 校准
- type / maintenance.subtype: **maintenance / ui-ux**
- source.kind / refs: user-request / GH-136
- debt estimate (校准后): incurred 2, repaid 5, net **-3**; scope **module** / risk **low-medium** (有范本, 风险下降) / areas [ui-ux] / confidence **medium** (explore 一手证据)
- revision: 见 INDEX `debt.revisions[]` — 影响面 11文件→6处/4文件; 方案 framer-motion→提炼 grid-rows; confidence low→medium。

## 8. 验收标准 (草稿; SPEC 与 verify 据此核对)
1. 新增共享折叠组件 `components/ui/<Collapsible>`, 经 `@/components/ui` 出口暴露; 动效 grid-rows + MOTION token; 内建 `motion-reduce`、`aria-hidden`/`inert`、chevron 旋转、收起延迟卸载。
2. instructions 三 card + capabilities McpServerCard 迁移: 从无动画 → 有 grid-rows 高度过渡 + chevron 旋转。
3. NoteCard/TagFilter 反向接入共享组件后, **行为不退化** (懒加载 body、focused 自动展开、aria/inert、延迟卸载、reduced-motion 全部保留) — 有组件测试守护。
4. 约定页保留 VirtualGroupedList; 展开/收起后虚拟列表滚动布局正确无错位 — **真跑 CDP 观察时序** (不变量 22 + memory `runtime-behavior-needs-real-run`)。
5. 折叠节奏与 teams 页观感一致 (duration/ease 对齐 MOTION token)。

## 9. 界面质量与交互验收
- **页面结构**: 约定页 = PageChrome + ScopeFilterChips + VirtualGroupedList(按 scope 分组) + 行内可展开 card; 记忆页/能力页同构。
- **可见状态**: 展开/收起/focus/hover/reduced-motion 全覆盖。**不得破坏 focus 自动展开** (instructions SkillCard `137-139` / GenericAssetCard `237-239`; memory NoteCard `273-285`)。
- **交互反馈**: chevron 旋转 + 高度过渡。主观视觉 (间距/对齐/动画快慢) 最终由用户裁判, verify 截图请用户确认再收口 (不变量 22)。
- **可访问性**: 现手写 card 的展开 button **多数缺 `aria-expanded`** (对照 NoteCard 详情区有 aria-hidden/inert、TagFilter toggle 有 aria-expanded)。共享组件须内建 `aria-expanded`/`aria-controls`/`inert`。
- **响应式**: card 头部计数项窄屏不溢出 (teams 用 `hidden md:inline-flex`)。

## 10. 测试策略 (design 细化, 纳入 HeroUI friction 教训)
- 单元/组件测试: 共享 Collapsible 的展开/收起 state、aria 属性、reduced-motion 分支、延迟卸载 (fake timer); 迁移点回归 (focused 自动展开、懒加载)。
- ⚠ **不靠本地单平台绿** (friction `20260611-...-multiselect-test-single-popover`: overlay/动画 unmount 时序平台相关, 本地绿 ≠ CI 绿)。
- ⚠ **CDP 走查折叠动画**: `waitFor(visible)` ≠ 动画完成 (friction `20260611-...-popover-animation-click-race`: 动画期间点击/断言会被吞)。折叠动画 settle 后再断言高度/可见性, 断言落在受控态。
- grid-rows 方案规避了 framer-motion 浮层的多数时序坑, 但虚拟列表 + 动画的滚动正确性仍须真跑 (验收标准 4)。

## 11. 未决问题 (design 向人澄清)
1. **[design 边界拍板]** 本任务范围 = "共享组件 + 全部 6 处 A 类收敛", 还是先"最小验证切片" (共享组件 + 仅 instructions 三 card / 甚至仅 MemoryCard) 验证体验再分批? 用户曾倾向先最小验证。
2. **[design]** `TagFilter` (标签筛选网格) 与 `NoteCard` (详情) 内容形态不同, 是否共用同一 `<Collapsible>` 抽象, 还是抽"折叠容器"基元 + 两种内容? 影响组件 API 形态 (受控/非受控、是否暴露 header slot)。
3. **[design]** `feature-guide-panel.tsx` FeatureGuidePanel 当前动画状态待核实, 确认它确实是 A 类无动画退化版。
4. **[design 低优先]** 是否本任务一并给 teams/PluginCard 的 HeroUI Accordion 传 motionProps 对齐 MOTION token, 还是另起 issue。

# 01-ANALYSIS — GH-105 Radix → HeroUI 整库重构 (Explore)

> Explore 产物。证据来自 14-agent 并行审计 (设计系统 / 组件普查 / 8 页 UI+状态 / 4 份 HeroUI 官方英文契约) + 主 Agent 复核 globals.css / tailwind.config.ts / App.tsx / theme-provider / utils。
> 用户已授权全自主推进, 中途不提问 → 原本属于"未决问题"的 PRD 级取舍, 本文档以「关键决策 (自主裁定)」记录裁定与理由, 不置 blocked。

## 现状理解

- 任务仅触及**渲染进程** `src/renderer/src/` (React 19 + TS, CSR)。主进程/preload/IPC 契约不变, 唯一跨进程接触点是 `window.api.theme.set` (ThemeProvider 同步 Electron 原生主题)。
- **当前 UI 栈 = shadcn/ui**: Radix 无头 primitives + Tailwind 3.4 (`darkMode:'class'`) + `class-variance-authority` + `clsx` + `tailwind-merge` (`cn()` @ `lib/utils.ts`) + `lucide-react` + `recharts` + `@floating-ui/react` + `react-virtuoso` + `zustand` + `react-router-dom 7` + `i18next` (en/zh)。
- **主题机制**: 自定义 `ThemeProvider` (`components/theme-provider.tsx`) 在 `documentElement` 上 toggle `.dark` class, localStorage `berth-theme`, 同步 `window.api.theme.set`。`globals.css` 定义 shadcn 风 HSL CSS 变量, `tailwind.config.ts` 用 `hsl(var(--*))` 映射。**无彩色 accent, 无 accent 切换** (只有 dark/light/system)。
- **Radix 真实使用面 = 仅 2 文件** (ripgrep 验证): `pages/session-detail.tsx` (`@radix-ui/react-tabs`) + `components/shared/category-jump-nav.tsx` (`@radix-ui/react-navigation-menu`)。
- **死依赖 (声明但 src 零引用, 可删)**: 8 个 Radix 包 (`collapsible/dialog/dropdown-menu/scroll-area/select/separator/slot/tooltip`) + **`cmdk`** (search-dialog 手搓命令面板, 未用 cmdk)。
- 页面: 7 路由页 (`overview/sessions/session-detail/instructions/capabilities/usage/settings`) + layout shell (`app-layout/sidebar/top-navigation/project-scope-switcher/window-controls`) + ~30 个 `components/{shared,layout,settings,capabilities,memory}` 组件。**无 `components/ui/` 统一封装层** → 印证用户"各自为战"判断。

## 关联与依赖 (迁移高风险耦合点)

| 耦合点 | 说明 | 迁移约束 |
|---|---|---|
| 单色 `--primary`/`--accent` | 全应用 `bg-primary`/`text-primary`/`bg-accent` 都解析到中性黑/白; `CHART_SERIES_FILL='hsl(var(--primary))'` 也吃它 | 改蓝是**全局 token 变更**, 爆炸半径覆盖所有页, 必须全局视觉回归 |
| `lib/chart-colors.ts` | recharts 颜色源, **GH-103 并发任务正在改** (工作区有未追踪 `gh-103-unify-chart-colors/`) | 本任务**不碰** chart-colors.ts, 只交叉引用; recharts 主题靠内联 `hsl(var(--*))` 字符串 |
| `floating-popover.tsx` | GH-102 刚做的 `@floating-ui` hover-bridge/safePolygon 大面板 (commit 7c2aa85 portal shared popovers) | **不回归 GH-102**; 该 hover-intent 桥不盲目换 HeroUI Popover |
| sidebar `position:fixed` + JS 宽度同步 + scrollbar-gutter 测量 + drag-resize | `app-layout` 用 marginLeft 镜像宽度 | 不可用 HeroUI 布局 primitive 替换外壳, 只换内部 atoms |
| `-webkit-app-region` drag/no-drag | sidebar/top-nav/scope/window-controls 大量依赖 | 任何 DOM 包裹/重排须保留拖拽区域 |
| 平台条件 chrome | macOS 拖拽带; Windows `WindowControls` + 72px header 数学 (`--berth-page-top-offset:6rem`) | header 高度不可随意改, 否则 traffic-light 对齐与内容顶偏移错位 |
| `PageChrome` context | 所有路由经 `usePageChrome` 注入 title/subtitle/breadcrumb/leading/actions/guide/search 到全局 top-nav | top-nav 重设计必须保留该 slot 契约 |
| `data-testid` | 测试断言 `app-content-scroll/app-sidebar/top-navigation/window-controls/page-guide-panel/instruction-asset-card-*/memory-note-card-*/hook-lifecycle-*` 等 | 组件替换必须保留 testid 或同步改测试 |
| `react-virtuoso` 虚拟化 | sessions/instructions/memory 用 `GroupedVirtuoso` + customScrollParent + 固定行高 | HeroUI Table/Listbox 自带 DOM, 不能整体替换; 只在 renderItem 内借用 HeroUI atoms |
| 共享工作区多 Agent 并发 | globals.css / tailwind.config.ts / 共享组件是高频文件 | 窄暂存, 小步提交, 只 add 自己文件; 禁 `git add -A` |

## 任务分类与 debt 校准

- `type=feature` 维持 (净增 debt 的迁移, 非净偿还的 maintenance)。
- **校准 (相对 0.0-new)**: Radix 机械面远小于初判 (仅 2 文件 + 9 死依赖), 但真实范围更偏 ui-ux/architecture — 采用 HeroUI v2 (新增 framer-motion + react-aria 重依赖) + 沉淀共享 DS 封装层 (~15-20 wrapper) + 7 页 + ~30 组件视觉重构 + 主题/accent 体系 + 动画补全。consolidation (删 9 死依赖、合并 3 处 focus-trap modal/4 处 accordion/多处 badge) **偿还可观 ui-ux 债**。
- `debt.estimate` → incurred 16 / repaid 10 / **net 6** / scope global / risk high / areas [ui-ux, architecture, dependency] / confidence medium。追加 `debt.revisions[]` 记录此校准。

## 验收标准 (编号, SPEC 与 verify 据此核对)

1. **AC1 依赖收敛**: 移除 8 个死 Radix 包 + `cmdk`; 迁移 2 处真实 Radix (Tabs / NavigationMenu) 后移除最后 2 个 Radix 包 → `package.json` 与 `src` 内 `@radix-ui` 归零。
2. **AC2 HeroUI 落地**: 引入 HeroUI (版本见 D1) + Provider + Tailwind 插件 + pnpm hoisting, 烟测组件在 dark/light 下正确渲染 (非 unstyled)。
3. **AC3 共享 DS 层**: 新建 `components/ui/` 统一封装层 (Button/Card/Chip/Input/Select/Tabs/Switch/Slider/Modal/Drawer/Dropdown/Tooltip/Accordion/Skeleton/Spinner/Badge/Avatar/Kbd/Alert + EmptyState/StatCard 等 berth 既有 primitive), 行为/样式集中, 所有页面只消费该层 (用户核心要求)。
4. **AC4 主题/accent 体系**: 引入真正蓝色 primary + **可切换强调色** (≥3 个 accent), 经 ThemeProvider 持久化; dark/light × accent 组合正确。
5. **AC5 视觉统一**: 全应用收敛到 HeroUI 暗色 dashboard 语言 — 卡片 radius 上调 (~rounded-large/2xl)、分层近黑背景 (sidebar<content<card 可辨)、soft elevation、统一 icon 比例、统一 chip 词汇 (语义色 success/warning/danger/primary)、消除 text-[10px]/[11px] 散乱微排版。
6. **AC6 重复收敛**: 3 处手搓 focus-trap modal → HeroUI Modal/Drawer; 4 处 chevron 折叠 → 统一 Accordion; 多处 badge/pill → 统一 Chip; 多处分段选择器 → 统一 Tabs/segmented。
7. **AC7 状态完备**: 每个页面/面板有一致的 loading (Skeleton)、empty (EmptyState)、error、disabled、focus-visible 状态; 补齐 instructions/capabilities 缺失 loading; error 通道若需 hook/IPC 改动超范围则记 issue 交叉引用。
8. **AC8 动画补全**: 进入/退出、hover、focus、展开/折叠、tab 切换统一 motion; 尊重 `prefers-reduced-motion`。
9. **AC9 无回归**: GH-102 hover-bridge、GH-103 chart 颜色、虚拟化、拖拽区域、平台 chrome、PageChrome 契约、data-testid、i18n(en/zh) 全部不回归。
10. **AC10 门禁**: `pnpm typecheck` + `lint` + 目标/全量 `test` 通过; `electron-vite build` 成功; Electron 实测窗口截图视觉验收 (dark + light + ≥1 accent)。

## 界面质量与交互验收 — 现状基线 (rule 22)

跨页**高度一致**的问题 (8 页审计交叉验证):

1. **强调色缺失** — `--primary`/`--accent` dark 为 `0 0% 98%` 近白, light 近黑; 唯一蓝是 `--chart-1` (仅图表用)。active nav/选中 pill/model badge/KPI 强调全是灰白, 非品牌蓝。**第一大缺口**。
2. **radius 偏小且漂移** — `--radius:0.5rem`(8px); 同屏常见 rounded(4)/md(6)/lg(8)/xl(12)/full 五种半径并存, 无统一卡片半径; 目标 ~16px。
3. **无 elevation** — 几乎全是 1px border-only 平面; 仅 popover/EmptyState 偶有 shadow。
4. **背景分层过弱** — dark background 3.9% / sidebar 5% / card 5.5% 差 ~1.6% L, 三层近乎一体。
5. **无语义涨跌 chip** — 全应用无 green/red delta chip; KPI/cost/failed 多用裸数字或仅变红。
6. **chip/badge 词汇碎裂** — 每页 3-5 种 pill (ScopeBadge zinc / CostSourceBadge emerald-sky-amber / 本地 Badge / 各路内联 pill), padding/size/radius/色各异, 大量硬编码色绕过 token。
7. **focus ring 不一致** — ring-1 vs ring-2、ring vs sidebar-ring、focus vs focus-visible; SessionRow/分段按钮/折叠按钮**无 focus-visible** (键盘焦点不可见, a11y 缺陷)。
8. **icon 尺寸不一** — h-3/h-3.5/h-4/h-5 混用, 无统一 lucide 比例; window-controls 用独有 strokeWidth 1.8。
9. **微排版泛滥** — text-[10px]/[11px] 充斥重要内容 (路径/计数/env), 低于合理下限, 暗色 muted 对比度存疑。
10. **重复手搓** — 3 处 focus-trap modal (settings-dialog/search-dialog/file-viewer-drawer, ~150 行重复)、4 处 chevron 折叠、多处分段选择器、多处本地 Badge。
11. **双浮层系统** — guide 用 Floating UI, scope-switcher 用手搓 absolute div (无 focus trap、无 outside-click 关闭)。
12. **状态缺口** — instructions 资产 tab / capabilities 无 loading 态; useSessions/useSessionDetail 无 error 通道 (失败被当空态)。
13. **a11y 缺口** — 多处 native `title=` 当 tooltip (键盘/SR 不可达)、`<details>`/`<select>` 充当 menu、折叠缺 aria-expanded、纯色状态编码。

## 外部契约关键事实 (HeroUI, 英文官方, 决策依据 — invariant 9)

> 来源: heroui.com / v2.heroui.com / @heroui/theme 源码 / GitHub README+discussions。版本敏感, design/implement 实装前以钉死版本的包内 README 复核。

- **HeroUI 已分裂为两条不兼容线**:
  - **v3** (stable 默认, React 19 原生): 要求 **Tailwind v4** + CSS-first (`@import "@heroui/styles"`)、OKLCH token、**无 `heroui()` 插件、无 HeroUIProvider、无 framer-motion** (改原生 CSS transition)、compound 组件、组件重命名/移除 (Navbar/Divider→Separator 等)、collection 需显式 `id`+`textValue`、`useDisclosure→useOverlayState`。采用 v3 ⇒ 必先把 berth Tailwind 3.4 → v4 (大爆炸半径) **且 v3 仍标 beta / "not backward compatible"**。
  - **v2** (`@heroui/react@2.8.x`, React 19 兼容, 维护态): 经典 `tailwind.config` `plugins:[heroui()]` + content glob `./node_modules/@heroui/theme/dist/**`、`darkMode:'class'` (与 berth 完全一致)、peer `framer-motion>=11.9`、需 `HeroUIProvider`、pnpm 需 `.npmrc public-hoist-pattern[]=*@heroui*`。**直接落 berth 当前 Tailwind 3.4, 最小基建改动**。
- **暗色兼容**: HeroUI 纯靠根元素 className 切主题; berth 既有 `.dark` toggle 已满足, **无需 next-themes**, 复用现有 ThemeProvider 即可。
- **主题/accent**: v2 `heroui({themes, layout, defaultTheme})` 插件; 语义 token = background/foreground/divider/overlay/focus/content1-4 + default/primary/secondary/success/warning/danger (各带 50-900 scale + DEFAULT + foreground)。layout token: radius(small 8 / medium 12 / large 14px)、borderWidth、fontSize、disabledOpacity、hoverOpacity、boxShadow。**运行时切 accent = 切根 className 上的 named theme** (须预定义) 或直接改 `--heroui-primary-*` CSS 变量。token 与 shadcn 同为 `hsl(var(--*))` 结构, namespace `--heroui-*` 不冲突 → 可桥接到 berth 既有 var。
- **组件齐备 (v2)**: Button(solid/bordered/light/flat/faded/shadow/ghost + danger)/Card/Input/Select/Autocomplete/Dropdown(danger item)/Modal/Drawer/Popover/Tooltip/Tabs(直替 radix-tabs)/Switch/Slider(数组→range)/Chip(onClose 可关闭)/Badge/Avatar+Group/Table(内置虚拟化+排序)/Skeleton/Spinner/Listbox/Breadcrumbs/Navbar/Kbd/Accordion/Alert。
- **缺口 (两版皆无, 保留现状)**: 无图表 (保留 recharts)、无通用虚拟列表 (保留 react-virtuoso)、无 cmdk 式命令面板 (Listbox 仅"基础", 保留手搓/用 Listbox 重built)、scroll-area 仅 ScrollShadow (非自定义滚动条)、**NavigationMenu 无对应** (category-jump-nav → Listbox 或薄自定义 nav)。
- **浮层/裁剪 (对应 GH-102)**: v2 Modal/Popover 默认 portal 到 `document.body` + React Aria 碰撞 (shouldFlip/containerPadding/offset), 结构上规避祖先 overflow/transform 裁剪。但 berth 已用 Floating UI → 引入 HeroUI 浮层 = 双定位系统, 需划清边界。
- **动画**: v2 默认 framer-motion; `HeroUIProvider disableAnimation` 全局关 (并 tree-shake framer-motion)、每组件亦有 `disableAnimation`; `reducedMotion='user'` 跟随系统。
- **Provider props (v2)**: `navigate`(接 react-router useNavigate)、`useHref`、`locale`(接 i18next)、`disableAnimation`、`reducedMotion`、`validationBehavior`。
- **风险**: ① `@latest` 解析到 v2(2.8.x) 而非 v3, v3 仅在 `@beta`, 须刻意钉版本; ② 缺 content glob / pnpm hoisting ⇒ HeroUI 组件**静默无样式** (常见坑, AGENTS 已警示 pnpm 9.x 敏感); ③ framer-motion (~25KB) + react-aria 为净新增重依赖; ④ v2.7+ 官方文档已转向 Tailwind v4, 跟"官方 v2 文档"会拿到 TW4 配置 → 须对齐 TW3 用法并实装验证。

## 关键决策 (Agent 自主裁定, 用户已授权)

> 用户授权全自主、中途不提问。以下 PRD 级取舍由 Agent 基于上述证据裁定; 详细方案进 02-SPEC。

- **D1 — 采用 HeroUI v2 (钉 `@heroui/react` 最新 v2.x, 保持 Tailwind 3.4)。** 理由: v3 强制 Tailwind 3.4→v4 大迁移 + 仍 beta + "不向后兼容", 与"稳定生产重构 + 风险纪律"冲突; v2 稳定、React 19 兼容、`darkMode:'class'` 与 berth 完全契合、组件齐备、最小基建爆炸半径。framer-motion 成本可接受 (正是"动画补全"所需)。implement 第一步**先装 + 烟测**确认 TW3 下有样式, 失败回退钉 v2.6.x。
- **D2 — 主题桥接 (单一真源偏 HeroUI)。** `heroui()` 插件定义 light/dark + accent named themes, berth 设计 token 收敛到 HeroUI 语义 token; 共享 DS 层只用 HeroUI token 类 (`bg-content1`/`text-default-500`/`text-primary`...)。保留 globals.css 既有 var 作过渡桥, 逐步迁移组件; recharts 继续读现有 chart var (不碰 GH-103)。
- **D3 — accent 切换**: 引入蓝 primary (HeroUI #006FEE 系) + ≥3 备选 accent (如 blue/violet/emerald/amber/rose), 经 named theme class 切换, ThemeProvider 扩展持久化 (`berth-accent`)。
- **D4 — 浮层边界**: HeroUI Modal/Drawer/Dropdown/Select/Tooltip(focus/简单 hover) 替换手搓 focus-trap 与 native 控件; **保留 `floating-popover` (Floating UI) 承载 GH-102 的 hover-bridge 大 guide 面板**, 不回归。在 SPEC 写清边界, 避免双系统冲突。
- **D5 — 虚拟化/图表/命令面板**: recharts、react-virtuoso、search-dialog 命令面板**保留**, 仅在内部借用 HeroUI atoms; cmdk 依赖删除 (本就未用)。
- **D6 — category-jump-nav**: 迁 HeroUI Listbox (variant=flat, section + endContent count) 获 ARIA/roving keyboard; session-detail tabs → HeroUI Tabs。
- **D7 — 增量策略**: 基建(deps+provider+theme+tailwind plugin) → 共享 DS 层(逐组件+测试) → 2 处 Radix 迁移 → 重复收敛 → 逐页消费+重构 → 动画 → 删死依赖。每步小提交、先测后勾、只 add 自己文件。
- **D8 — 超范围项记 issue**: error 通道缺失 (需 hook/IPC 改动)、settings 单列改分段导航等若超出本线验收, 记 `docs/issues/` 交叉引用, 不混入本实现。

## 关联 friction / issues

- 已复用既有 friction `20260603-2.0-design-ci-wait-pnpm-double-dash.md` (CI wait 用 `pnpm harness:ci:wait --sha <sha>` 去掉 `--`)。
- 探索中发现的超范围产品缺口 (error 通道等) 将在 design/implement 按 D8 落 `docs/issues/`。

---
下一步: `harness-2.0-design` → 02-SPEC.md (架构/token/共享层/组件映射/动画/测试矩阵) + 03-PLAN.md。

# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

## 顺序 / 并行边界
- **T1 必须最先** (其余全部依赖共享组件)。
- **T2 / T3 / T4 / T5 文件互不重叠** (instructions / capabilities / feature-guide-panel / memory-view), T1 后可并行。
- **T6 依赖 T3** (同改 capabilities.tsx, 须 T3 之后) 且依赖 T1。
- **T7 最后** (全量验收)。
- 共享工作区: 每项只暂存自己文件, 完成即提交 (COMMIT_POLICY)。

---

- [x] **T1 — 共享 Collapsible primitive** (基础, 先行) ✅
  新建 `src/renderer/src/components/ui/collapsible.tsx`: `Collapsible` (受控 grid-rows body 容器 + `aria-hidden`/`inert` + `motion-reduce` + 可选 `unmountOnExit` 延迟卸载) + `CollapsibleChevron` (ChevronRight + `rotate-90` 过渡); `components/ui/motion.ts` 新增 `ACCORDION_MOTION_PROPS`; `@/components/ui` 出口导出三者; barrel.test 增项。
  - tests: `tests/renderer/ui/collapsible.test.tsx` (新, 10 用例) — **偏差**: SPEC 写 `tests/unit/...`, 实际 renderer 组件测试在 `tests/renderer/ui/` (jsdom)。覆盖 open 切换 grid-rows/opacity + aria-hidden/inert; reduced-motion; unmountOnExit 延迟卸载 (fake timer); chevron rotate。
  - verify: ✅ typecheck:web + typecheck:test + lint 绿; 12 测试通过 (含 barrel)。测试文件需显式 `import React` (vitest classic JSX runtime; IDE 的 unused-React [6133] 是 automatic-runtime 噪音, 全测试通病)。

- [x] **T2 — instructions 三 card 迁移** (依赖 T1) ✅
  MemoryCard/SkillCard/GenericAssetCard: `{expanded&&<div>}` → `<Collapsible open unmountOnExit>`; chevron 换 `CollapsibleChevron`; trigger 加 `aria-expanded`/`aria-controls`; 移除 ChevronDown/ChevronRight import。
  - **决策**: instructions 三 card 用 `unmountOnExit` 还原原 `{expanded&&}` 的"收起即移出 DOM"语义 (+ 动画延迟卸载), 守住 instructions-guidance 的 `getAllByText(path)` 单次断言。
  - tests: ✅ instructions-guidance (7) + instructions-plugin-nav (3) 全绿 — 含 SkillCard/GenericAssetCard focused 跳转自动展开回归 + path 单次出现。
  - verify: ✅ typecheck:web + lint + 10 测试通过。展开过渡/chevron 旋转的视觉验收留 T7 CDP。

- [x] **T3 — capabilities McpServerCard 迁移** (依赖 T1) ✅
  McpServerCard `{expanded&&}` → `<Collapsible open unmountOnExit>`; chevron 换 CollapsibleChevron; trigger 加 aria; 保留 focused scrollIntoView+展开; 移除 ChevronDown import (ChevronRight 仍由 PluginCard line 310 用, 保留)。
  - tests: ✅ capabilities 6 测试文件 20 用例全绿 (含 plugin-nav/hook-nav focused 自动展开)。
  - verify: ✅ typecheck:web + lint + 20 测试通过。视觉验收留 T7。

- [x] **T4 — feature-guide-panel 迁移** (依赖 T1) ✅
  FeatureGuidePanel `{expanded&&hasDetails&&}` → `<Collapsible open unmountOnExit>`; `useId` 关联 aria-controls; button 加 aria-expanded; chevron 保留现有 ChevronDown+rotate-180 (文字"显示详情"按钮场景; 右→下统一与否留 T7 taste)。
  - tests: ✅ guidance (instructions/capabilities) + shared-guidance-primitives + teams 共 42 用例全绿。
  - verify: ✅ typecheck:web + lint + 42 测试通过。展开过渡视觉验收留 T7。

- [x] **T5 — memory-view NoteCard 反向接入 + TagFilter 纳入** (依赖 T1) ✅
  NoteCard: 手写 grid-rows + detailsMounted/collapseTimerRef → `<Collapsible open unmountOnExit unmountDelayMs={DETAILS_COLLAPSE_MS} testId>`; 移除收起 useEffect (Collapsible 内建延迟卸载); 保留懒加载 ensureBody / focused 自动展开 / reduced-motion; chevron → CollapsibleChevron。TagFilter 筛选网格 → `<Collapsible open={showGrid} testId>` (保留 `-grid` testid + 外点关闭)。**Collapsible 增 `testId` prop** 透传外层 always-mounted grid div (守 `memory-note-details`/`-grid` testid 断言)。
  - tests: ✅ memory 8 文件 71 用例全绿 (memory-view 15: grid-row motion state + missing note 展开 + TagFilter toggle/外点关闭; collapsible 11 含 testId 用例)。
  - verify: ✅ typecheck:web + lint + 71 测试通过。NoteCard 行为不退化。

- [x] **T5.5 — chevron 右侧统一 (用户 implement 中追加)** ✅
  统一为 teams HeroUI Accordion 风格右侧 indicator: `CollapsibleChevron` 改 `ChevronLeft`(‹) + open `-rotate-90`(→▾, 匹配 HeroUI `ChevronIcon` path `M15.5 19l-7-7 7-7` 指左 + open 旋转); instructions 3 card + capabilities McpServerCard + memory NoteCard 的 chevron 从 button 左侧移到右侧末尾。feature-guide-panel 是文字 toggle 按钮 (非卡片头折叠), chevron 暂留 ▼/▲ — 审计项, 交用户定。
  - tests: ✅ collapsible chevron 方向测试更新 (-rotate-90 / 指左); instructions/capabilities/memory/collapsible 101 测试绿。
  - verify: 真机截图对比 teams 留 T7 (位置/方向最终用户裁定, 不变量22)。

- [x] **T6 — HeroUI 侧对齐 MOTION token** (依赖 T1 + T3) ✅ (真机待 T7)
  teams.tsx + capabilities PluginCard 的 AccordionItem 传 `motionProps={ACCORDION_MOTION_PROPS}` (height auto + opacity, 时长走 MOTION.duration.base)。
  - tests: ✅ typecheck:web (motionProps 类型 OK) + lint + teams/capabilities 39 测试绿 (渲染不报错 + 可展开)。
  - verify: **height auto 是否被破坏须 T7 真机确认**; 若破坏 → fallback 移除 motionProps + 记 issue。

- [x] **T7 — 全量真跑验收** ✅
  CDP 真机截图 (agent 实例 gh136-verify + 用户 dev pid 40160 受保护未重启): 约定/Skills/MCP/Teams 四页确认 chevron 已统一右侧 (收起 ‹ / 展开 ▼, 与 teams HeroUI 一致); 约定页 MemoryCard 展开显示 grid-rows 详情 + 虚拟列表布局正确无错位。
  - tests: ✅ 全量 typecheck (node/web/test) + 1169 测试绿; CDP 4 页截图。
  - verify: ✅ chevron 右侧统一 + 展开详情截图已发用户确认 (taste 待用户最终裁定)。**残余**: T6 teams/PluginCard height-auto 展开动画真机未单独点击验 (渲染正常 + motionProps 类型 OK); 元素审计未统一项见下。

## 元素审计 (用户追加 "检查其他未统一元素")
- **ScopeBadge 样式**: instructions 三 card 用 `rounded-full px-2 font-semibold` (pill), capabilities McpServerCard 用默认 `<ScopeBadge>` — 不一致, 建议统一 (待用户定方向)。
- **左侧语义图标色**: Skills 的 Sparkles `text-blue-500`、Plugins 的 Puzzle `text-purple-500`, 其余 `text-muted-foreground` — 语义类型色, taste 项交用户 (memory: 用户偏好克制视觉, 慎用 loud blue)。
- **feature-guide-panel chevron**: "显示详情" 文字 toggle 按钮 (非卡片头), 仍用 ChevronDown ▼/▲, 未并入右侧 ‹→▼ — 不同 UI 模式, 待用户定。
- card 容器圆角/hover/间距: 已一致 (rounded-lg border bg-card hover:bg-accent/5)。

## verify 回写
- [x] **V1 — Collapsible 初始 timer 致 CI Unhandled** (macos pnpm test false-fail; 测试本身 1169 全 passed): `unmountOnExit` 初始 `open=false` 即启动无用收起 timer → memory-view 多 NoteCard 留 pending timer → Vitest teardown 报 "cancel timeouts" Unhandled Rejection。修: useEffect 加 `!mounted` guard + `mounted` 依赖, 初始/已卸载不启 timer。✅ 本地全量 test 无 Unhandled。
- [x] **V2 — 约定页 MemoryCard head 未垂直居中** (用户反馈): button `items-start` → `items-center`, 移 FileText/chevron 的 `mt-*` 微调; head 元素垂直居中, 与 Skill/Generic/Mcp card 一致。✅ (真机截图复核)
- 说明: CI windows `test:e2e` failure 属 GH-135 遗留 baseline (T1 纯新增组件即 failure 可证), 非本任务引入。

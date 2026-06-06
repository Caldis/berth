# 需求分析 (Explore 产物)

## 现状理解
渲染层 (Electron renderer, React 19 + HeroUI v2)。设计系统单一入口 `components/ui/`
(re-export HeroUI + berth composite `Chip`/`motion`); 页面与 `shared/` 只从
`@/components/ui` 引入 (ARCHITECTURE.md:46)。`styles/globals.css` 经 `html[data-accent]`
**同时驱动 berth `--primary` 与 HeroUI `--heroui-primary`** (ARCHITECTURE.md:47) — 故
HeroUI 控件用默认 `color`/语义 token 即与全站强调色一致 (上一轮 sessions `Tabs` 已验证)。

GH-105 已完成 Radix→HeroUI 核心迁移; 本任务承接其主动延后的"手写控件长尾"
(docs/issues/2026-06-05-IMPROVEMENT-heroui-migration-followup.md)。

### 手写控件审计 (renderer 全量扫描: `<input>`/`<select>`/`<details>`/本地 Badge)

| # | 位置 | 现状 (手写) | HeroUI 等价 | 归属 |
|---|---|---|---|---|
| C1 | `components/layout/top-navigation.tsx:162` | header 搜索 `<input>` + 绝对定位 Search 图标 + `<kbd>`(⌘K, `text-[10px]`) | `Input` (`startContent`/`endContent` + `Kbd`) | **本任务 · P1 (用户点名)** |
| C2 | `pages/usage.tsx:478` | cost-mode 原生 `<select>`+`<option>` | `Select`/`SelectItem` | 本任务 · P2 |
| C3 | `components/capabilities/hooks-lifecycle-view.tsx` | HookActions 原生 `<details>`/`<summary>` 充当菜单 | `Dropdown` | 本任务 · P2 |
| C4 | `components/shared/filter-bar.tsx:37,71` | `ScopeSelect` 原生 `<select>` + `FilterBar` 原生 `<input>` | `Select` + `Input` | 本任务 · P3 (共享, 3 处消费) |
| C5 | `components/memory/memory-view.tsx:539` | 记忆搜索 `<input>` | `Input` | 本任务 · P3 |
| C6 | 本地 Badge/pill: `memory-view.tsx`、`settings/agent-capability-plugins-section.tsx`、`pages/instructions.tsx` | 手搓 `rounded-full px-..` pill | `ui/Chip` | 本任务 · P3 |
| D1 | `components/layout/search-dialog.tsx` | 命令面板 `<input>` + 手搓 focus-trap + 键盘 nav | `Modal`+`Input` | **延后** (followup, 复杂浮层) |
| D2 | `pages/session-detail.tsx:1233` | duration 过滤 `<input type="range">` (自定义 `duration-filter-range`) | `Slider` | **延后/评估** (自定义样式+禁用态, followup) |

> 注: 大量 `<button type="button">` (图标按钮) 未列入 — followup 未点名全量 button 收敛, 且
> 多为一次性图标触发, 非本任务"有等价 primitive 的控件替换"主线; 如需统一 `Button` 另开任务。

## 关联与依赖
- C1 header input 由 `page-chrome.tsx` 的 `PageChromeSearch` 契约驱动 (`value`/`onValueChange`/
  `placeholder`/`ariaLabel`), 经 `searchInputRef` + `useRegisterPageSearchFocus` 实现 ⌘K 聚焦+全选。
  替换 `Input` 必须保留: 受控 value/onChange、ref 聚焦+`select()`、placeholder/aria-label、⌘K kbd、
  现有布局尺寸 (`h-9`, `sm:w-72`, flex 行为) 与各页 `usePageChrome` 调用 (契约不变, 仅换渲染)。
- C4 `filter-bar.tsx` 被 `project-scope-switcher.tsx`、`pages/capabilities.tsx`、`pages/overview.tsx`
  消费 → 改动需逐消费方验证, blast radius 最大。
- 与并行任务边界: GH-105 (verify, 勿动其收口文件)、GH-108 (sessions 列表重设计, 勿与其改同文件)。
  本任务上一增量已改 `pages/sessions.tsx` 切换器 (commit c27c446d), 不再重复动。

## 外部 SDK 行为待查 (不变量 9)
- **HeroUI `Input` 的 `ref` 语义**: 需确认 ref 是否转发到内部 `<input>` DOM (供 `focus()`/`select()`),
  以及 `onValueChange` vs `onChange` 契约。design/implement 前查 HeroUI v2 官方文档。
- **HeroUI `Select`/`Dropdown` 的 Portal/collision/键盘行为**: 与现有 `<select>`/`<details>` 的
  原生键盘语义差异 (尤其 C3 菜单)。design 阶段查官方文档再定方案。
- **`Kbd` 组件**: 是否支持 `⌘K`/`Ctrl+K` 跨平台呈现 (现状用 `isMac` 分支)。

## 任务分类与 debt 校准
- type / maintenance.subtype: maintenance / ui-ux (不变)
- source.kind / refs: docs-issues / heroui-migration-followup + GH-105 (不变)
- debt estimate 修正: 审计确认范围"有界但多于单模块" (6 组控件 + 散落 badge, 跨 layout/shared/pages),
  仍以偿还为主。estimate: incurred 4→5, repaid 6→9, net -2→-4。
- scope / risk / areas / confidence: scope=module (全 renderer UI 层, 无跨进程); risk=medium
  (C4 共享组件 + HeroUI 控件键盘/Portal 行为差异); areas=[ui-ux]; confidence low→medium。
- revision: 见 INDEX `debt.revisions[]` (explore)。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. **(P1)** header 搜索框改用 HeroUI `Input`: 保留受控 value/onChange、⌘K ref 聚焦+全选、
   placeholder/aria-label、Search 图标 (startContent)、⌘K/Ctrl+K 提示 (endContent, ≥text-xs);
   各页 `usePageChrome` 契约不变; 视觉与现有页头密度一致, 暗/亮/accent 切换正常。
2. **(P2)** `usage.tsx` cost-mode `<select>` → HeroUI `Select`; 选项/受控值/i18n 不变, 键盘可达。
3. **(P2)** hooks-lifecycle `HookActions` `<details>` 菜单 → HeroUI `Dropdown`; 保留动作项与
   开/关交互、可访问性 (role=menu)、不破坏只读项展示。
4. **(P3)** `filter-bar.tsx` `ScopeSelect`/`FilterBar` → HeroUI `Select`/`Input`; 3 处消费方
   (project-scope-switcher/capabilities/overview) 行为与 testid/i18n 不变。
5. **(P3)** `memory-view.tsx` 搜索 `<input>` → HeroUI `Input`; 行为/placeholder 不变。
6. **(P3)** 散落本地 Badge/pill (memory-view/agent-capability-plugins-section/instructions)
   → `ui/Chip`; 语义色/密度统一, ≥text-xs。
7. 每项门禁全绿 (typecheck/lint/目标 test/build); UI 项截图视觉验收 (用户裁判)。
8. 延后项 (search-dialog 命令面板 Modal、session-detail range→Slider) 不在本任务,
   仅在 followup issue 保留并交叉引用。

## 界面质量与交互验收
- **现有结构**: header (top-navigation) = breadcrumb + 标题 + actions + guide + 搜索框; 搜索框
  手写, 与 sidebar/category-jump-nav 等已 HeroUI 化的控件视觉语言不完全统一 (这是用户"没处理好"
  的来源: 原生 input 无 HeroUI 的 focus-ring/hover/圆角/密度一致性)。
- **设计系统用法**: `ui/` 已提供 `Input`/`Select`/`Dropdown`/`Kbd`/`Chip`/`Slider`; 本任务即把
  手写控件接到这些 primitive。
- **可见状态**: 搜索框需保留 hover/focus/placeholder; Select/Dropdown 需 disabled/open/键盘态;
  Chip 需语义色。
- **响应式/可访问性**: header 搜索框 `sm:w-72`+flex; Input 需 aria-label; Dropdown/Select 键盘可达
  (替换原生控件后尤其要测键盘, 见外部 SDK 待查)。
- **风险**: HeroUI 受控 Input 的 ref/onValueChange 契约、Select/Dropdown 的 Portal 在已知
  popover 裁剪历史 (GH-102) 下的层级表现 — implement 时实测。

## 未决问题
留给 design 向人澄清:
- 本任务批次范围: 是否一次推进 C1–C6 全部, 还是先交付 C1 (header input) 再按 P2/P3 增量? (倾向
  C1 先单独交付验收, 其余逐项小步提交; 待 design 与用户确认)
- C4 共享 `filter-bar` 改动 blast radius 较大, 是否纳入本任务还是拆 followup? (倾向纳入但单独提交)

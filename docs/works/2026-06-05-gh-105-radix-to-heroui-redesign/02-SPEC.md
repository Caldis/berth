# 02-SPEC — GH-105 Radix → HeroUI 整库重构 (Design)

每条回指 01-ANALYSIS 验收标准 (AC1-AC10) 与裁定 (D1-D8)。

## 架构决策总览

- **库**: HeroUI **v2** (`@heroui/react` 最新 v2.x, peer `framer-motion`), 保持 Tailwind 3.4 (D1)。
- **集成形态**: `heroui()` Tailwind 插件 + content glob 到 `node_modules/@heroui/theme/dist`; `darkMode:'class'` (沿用); pnpm `.npmrc public-hoist-pattern[]=*@heroui*`; `HeroUIProvider` 包裹 App, 接 `navigate`(react-router)/`locale`(i18next)/`reducedMotion="user"`。
- **主题策略 (D2, 桥接 + 渐进)**: 不做全量 token 重命名。两步并行:
  1. **即时视觉**: 更新 `globals.css` 既有 HSL 变量值 (蓝 primary、放大 radius、加深分层、补 elevation), 让所有现存组件无需改动即贴近目标。
  2. **渐进架构**: 新建 `components/ui/` 共享层建在 HeroUI 之上 (用 HeroUI token); `heroui()` 主题配成与 globals.css 视觉一致; 页面/组件逐步迁移到共享层。两套 token namespace (`--background...` vs `--heroui-*`) 不冲突, 调成同值即视觉统一。
- **不碰**: `lib/chart-colors.ts` 与 `--chart-*` (GH-103 并发); `floating-popover.tsx` 的 hover-bridge (GH-102)。

## 数据契约

- **无 IPC/数据模型变更**。唯一跨进程接触: ThemeProvider 已有的 `window.api.theme.set(theme)`; 新增 accent 仅渲染层 localStorage (`berth-accent`), 不进主进程 (除非后续要原生同步, 不在本范围)。
- **共享数据契约页面 (rule)**: 本任务是纯展示层重构, 不改任何 selector/字段; 所有页面的字段读取保持原样, 只换呈现组件与样式。

## 模块结构 / 组件拆分

### 目录约定 (AC3, 回应用户"共享组件目录")
```
src/renderer/src/components/
  ui/                ← 新建: HeroUI 封装的统一 primitive 层 (DS 的唯一真源)
    index.ts         ← barrel, 页面/composite 只从这里 import
    button.tsx card.tsx chip.tsx input.tsx select.tsx tabs.tsx
    switch.tsx slider.tsx modal.tsx drawer.tsx dropdown.tsx
    tooltip.tsx accordion.tsx skeleton.tsx spinner.tsx avatar.tsx
    kbd.tsx alert.tsx listbox.tsx
    stat-card.tsx empty-state.tsx detail-row.tsx   ← berth 既有 primitive, 重建/迁入
    motion.ts        ← 统一动画时长/缓动 token
  shared/            ← berth 领域 composite, 只消费 ui/ (不再直接手搓 primitive)
  layout/ settings/ capabilities/ memory/           ← 同上
```
- **ui/ 封装约定**: 每个 wrapper (a) 设定 berth 默认 (radius/size/variant), (b) 透传 `data-testid` 与 `className` (cn 合并), (c) 不内联文案 (i18n 由调用方传入), (d) 导出 berth 友好的窄 props + 必要时 re-export HeroUI 原 props。
- **composite 迁移**: `notice-panel`/`warning-banner`→`ui/alert`; `scope-badge`/`cost-source-badge`/各路本地 Badge→`ui/chip`; `tab-group`→`ui/tabs`; 3 处 focus-trap modal→`ui/modal`+`ui/drawer`; 4 处 chevron 折叠→`ui/accordion`。

### Token / 主题体系 (AC4, AC5, D2/D3)
- **primary 改蓝 (CTA + chart + focus)**: `--primary` light≈`212 100% 47%`(#006FEE 系), dark 同色或亮一档; `--primary-foreground` 白; `--ring`→primary。**导航选中态保持中性** (用 `--accent`/sidebar token, 不改蓝) —— 参考图蓝色只用于 CTA/数据。
- **radius**: `--radius` 0.5rem→**0.875rem(14px)**, 对齐 HeroUI large; tailwind borderRadius 增 `xl/2xl` 与 token 挂钩或用 HeroUI `rounded-large`。
- **分层 (dark)**: 加大 background/sidebar/card 的 L 差 (如 background 3.5% / content 6% / card 8%), 形成可辨近黑层级。
- **elevation**: 引入 `--shadow-sm/md` 软阴影 token, 卡片默认 subtle shadow + 1px border。
- **accent 切换 (D3)**: 预定义 ≥4 accent (blue 默认 / violet / emerald / amber / rose)。机制 (Task P2 烟测二选一定稿):
  - 候选 A: `heroui()` 定义 named themes (`light`/`dark` × accent), ThemeProvider 切根 class。
  - 候选 B: globals.css 下 `[data-accent="violet"]` 选择器覆盖 `--primary*` (及 `--heroui-primary-*`), ThemeProvider 设 `data-accent`。
  - 默认走 B (更贴合现有 ThemeProvider class-toggle 模型, 一处覆盖驱动两套 var); A 作为回退。
- **chip 语义色**: success/warning/danger/primary/default 五档统一映射 (替代 zinc/emerald/sky/amber/violet 硬编码)。
- **icon 比例**: 统一 lucide 默认 `h-4 w-4` (dense 上下文 `h-3.5`), strokeWidth 默认值; 收敛 window-controls 的 1.8 特例到统一值。
- **排版**: 设 `text-xs`(12px) 为下限, 消除 text-[10px]/[11px]; 大数字统一一个 scale token。

### Provider 接线 (AC2)
- `App.tsx`: `<ThemeProvider><HeroUIProvider navigate={navigate} useHref={useHref} locale={i18n.language} reducedMotion="user">...`。注意 `useNavigate` 必须在 Router 内 → Provider 组合点放在 Router 之内 (现有 App 已在 Router 上下文)。
- ThemeProvider 扩展: 增 `accent` 状态 + `setAccent`, 持久化 `berth-accent`, 设 `data-accent` 于 documentElement。

### 浮层边界 (D4)
- HeroUI 承载: Modal / Drawer / Dropdown / Select / Tooltip(focus+简单 hover) / Popover(简单)。
- 保留 Floating UI: `floating-popover.tsx` (GH-102 hover-bridge guide 大面板) — 不动。
- 约束: 同一 trigger 不得同时被两套浮层包裹。

### 保留不迁 (D5)
- recharts (无 HeroUI 图表)、react-virtuoso (无通用虚拟列表, 仅在 renderItem 内用 ui/ atoms)、search-dialog 命令面板 (用 ui/Modal 外壳 + 内部 Listbox, 但保留键盘逻辑); 删 `cmdk` 死依赖。

## 任务分类与 debt
- type=feature; source.kind=user-request; refs=[GH-105]。
- debt.estimate (explore 校准后): incurred 16 / repaid 10 / **net 6** / global / high / [ui-ux, architecture, dependency] / medium。design 不再变更估算 (与 explore 一致); 若 implement 中 framer-motion/react-aria 体积或迁移面显著偏离, 再追加 revision。
- debt.final 预期: 视实际删除依赖数与共享层收敛程度, repaid 可能上修; verify/archive 前填。
- 当前总 debt pool = -3 (ok), 无 override 需求。
- Project 字段同步: archive 阶段 `harness-projects.mjs done` 同步 final debt。

## 界面质量与交互验收 (rule 22)

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 分层近黑背景 (sidebar<content<card); 卡片 rounded-14 + soft shadow; 统一 padding scale; 收敛微排版到 ≥text-xs | Electron 截图比对参考图; 逐页 density 不再"扁平一体" |
| 组件选择 / DS 一致性 | 全部经 `components/ui/` HeroUI 封装层; chip/tabs/modal/accordion 各仅一种实现 | 代码审计: 页面无直接手搓 primitive; grep 无重复 focus-trap/chevron 实现 |
| 交互反馈 / 状态切换 | HeroUI hover/press/selected 动画 + framer-motion 进出场; tab/accordion/modal 统一 motion | 截图 + 交互实测 (hover/press/展开) |
| loading/empty/error/disabled/focus | Skeleton(loading)、EmptyState(empty)、Alert(error)、统一 focus-visible ring(primary); 补 instructions/capabilities loading | 逐页核对 5 态; 键盘 Tab 可见焦点 |
| 响应式 / a11y / 键盘 | HeroUI/React Aria 提供 ARIA+roving keyboard; 保留虚拟化/拖拽区; focus ring 统一 | 键盘走查关键路径 (nav/tabs/modal/dropdown); 保留 data-testid |
| 文案 / i18n | 所有文案经 t(); Provider locale 接 i18next; 不引入硬编码英文 | en/zh 切换走查; 现有 i18n 测试通过 |

## 测试策略

每个 `ui/` 组件: vitest + @testing-library/react — 渲染、关键 variant、a11y role、testid/className 透传、核心交互。页面迁移: 更新现有 renderer 测试, 保留 testid。基建: 烟测渲染 + build。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 备注 |
|---|---|---|---|---|
| HeroUI 在 TW3 下渲染有样式 | manual+build | — | `pnpm build` + Electron 截图 | P1 gate, 自动化难断"有样式" |
| HeroUIProvider 接线 (navigate/locale) | renderer | `tests/renderer/heroui-provider.test.tsx` | `pnpm test` | 渲染不报错 + 路由可用 |
| ThemeProvider accent 切换+持久化 | renderer | `tests/renderer/theme-accent.test.tsx` | `pnpm test` | set→localStorage+data-accent |
| ui/ 各 wrapper | renderer | `tests/renderer/ui/<comp>.test.tsx` | `pnpm test` | variant/role/testid/交互 |
| session-detail Tabs 迁移 | renderer | 现有 + `tests/renderer/session-detail*.test.tsx` | `pnpm test` | tab 切换、testid 保留 |
| category-jump-nav 迁移 | renderer | `tests/renderer/category-jump-nav.test.tsx` | `pnpm test` | active/onSelect/aria |
| 3 处 modal/drawer 合并 | renderer | 各自现有测试 + 新 | `pnpm test` | 焦点陷阱/Escape/backdrop |
| 页面重构无回归 | renderer | 现有页面测试 (含已改的 instructions-guidance) | `pnpm test` | testid/字段/i18n 不变 |
| jsdom 缺 API (ResizeObserver/matchMedia) | setup | `tests/setup.ts` (按需补 polyfill) | `pnpm test` | react-aria 依赖 |
| 整体门禁 | harness | — | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | AC10 |
| 视觉验收 | manual | — | Electron 实测窗口截图 dark/light/accent | AC5/AC10 |

> 例外: "HeroUI 在 TW3 有样式" 与最终视觉一致性无法纯自动化断言, 用 build 成功 + Electron 截图作为证据 (符合 AGENTS 截图验收约定)。

## 验收标准映射
| SPEC 项 | ANALYSIS AC |
|---|---|
| HeroUI v2 + Provider + 插件 + hoisting + 烟测 | AC2 |
| `components/ui/` 共享层 + 约定 | AC3 |
| token/主题/accent 体系 | AC4, AC5 |
| 视觉语言统一 (radius/elevation/分层/chip/icon/排版) | AC5 |
| modal/accordion/chip/segmented 收敛 | AC6 |
| 5 态完备 + focus-visible | AC7 |
| framer-motion 动画 + reducedMotion | AC8 |
| Radix 2 迁移 + 9 死依赖清理 | AC1 |
| 不回归 (GH-102/103/虚拟化/拖拽/chrome/testid/i18n) | AC9 |
| typecheck/lint/test/build/截图 | AC10 |

---
拆解任务清单见 03-PLAN.md。

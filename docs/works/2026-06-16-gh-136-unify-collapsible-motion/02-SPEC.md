# 技术方案 (Design 产物)

每条回指 01-ANALYSIS §8 的验收标准编号 [AC1..AC5]。

> 范围 (用户拍板): **全量统一** — 共享组件 + 6 处卡片折叠收敛 + TagFilter 纳入通用容器 + HeroUI 侧 (teams / PluginCard) 对齐 MOTION token。

## 数据契约

无 IPC / 数据模型变更。纯 renderer 表现层重构。不触碰 Asset model、preload、main。

## 任务分类与 debt
- type / maintenance.subtype: maintenance / ui-ux
- source.kind / refs: user-request / GH-136
- debt.estimate (design 校准): incurred **3**, repaid **6**, net **-3**, scope module, risk medium, areas [ui-ux], confidence medium
- debt.final 预期: net ≈ -3 (偿还为主); 建 1 个可复用 primitive, 消除 8 处折叠不一致
- revisions: design 追加一条 — 范围由 explore 的"6 处" 扩为"新 primitive + 8 迁移点 (含 TagFilter + 2 HeroUI)"; incurred 2→3
- Project 字段同步: ensure 已绑定; archive 前 `done` 同步 final debt

## 模块结构 / 组件拆分 (遵守 ARCHITECTURE 准入规则 6 + GH-105)

### 新增 primitive: `src/renderer/src/components/ui/collapsible.tsx`
落 `components/ui/` (设计系统 primitive, 被 4+ 页/组件消费, 符合准入)。经 `@/components/ui` 出口导出。**不直接依赖 framer-motion** (用 CSS grid-rows, 提炼自 memory-view NoteCard)。

```ts
export interface CollapsibleProps {
  open: boolean                  // 受控展开态; 调用方持有 state (兼容既有 focused 自动展开 / 懒加载)
  children: React.ReactNode
  id?: string                    // 内容区 id, 关联 trigger 的 aria-controls
  className?: string             // 作用于内容 wrapper (调用方现有的 border-t/px/py/space-y)
  unmountOnExit?: boolean         // 默认 false (grid-rows-[0fr] 已隐藏, children 常驻);
                                  //   NoteCard 设 true 保留"展开才挂载 + 懒加载 body"语义
  unmountDelayMs?: number         // 配合 unmountOnExit, 收起动画后卸载; 默认 MOTION.durationMs.base (200)
}
```
渲染契约 (= NoteCard 317-326 提炼):
- 外层 `<div aria-hidden={!open} inert={!open || undefined}` + `grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none` + `open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'`。
- 内层 `<div className="min-h-0 overflow-hidden"><div className={className}>{shouldRender && children}</div></div>`。
- `duration-200 ease-out` ≡ `MOTION.duration.base` (0.2s) + `ease.standard`; 注释标注单源对应。
- `unmountOnExit` 时: `useState(mounted)` + 收起 `setTimeout(unmountDelayMs)` 卸载 (提炼 NoteCard `detailsMounted` + `collapseTimerRef`, 含 cleanup)。

### 配套: `CollapsibleChevron` (同文件导出)
```ts
export function CollapsibleChevron(props: { open: boolean; className?: string }): React.ReactElement
```
`ChevronRight` 基底 + `open && 'rotate-90'` + `transition-transform duration-200`。替换 6 处卡片现有的 `{open ? <ChevronDown/> : <ChevronRight/>}` 图标互换 (右→下平滑旋转, 保持列表行 disclosure 惯例的视觉意图, 仅把"瞬时互换"变"过渡")。
> ⚠ feature-guide-panel / TagFilter 现状是 `ChevronDown + rotate-180` (下→上)。是否一并改为右→下统一样式, 列为 **verify taste 项交用户裁定** (AC5 + 不变量 22); 不在 design 钉死。

### trigger 的 aria
调用方 trigger `<button>` 加 `aria-expanded={open}` + `aria-controls={id}` (现状多数缺失, AC 可访问性)。不强制 trigger 组件 — header 形态差异过大 (整 button / input+button / h2+button), 强行 slot 化得不偿失。

### HeroUI 侧对齐: 共享 `ACCORDION_MOTION_PROPS`
新增常量 (置于 `components/ui/motion.ts`, 与 MOTION 同源) — framer-motion variants, height auto + opacity, transition 时长走 `MOTION.duration.base` / `ease.standard`。teams (`teams.tsx:105`) 与 capabilities PluginCard (`capabilities.tsx:274`) 的 `<Accordion>` 传 `itemClasses` 不变、新增 `motionProps={ACCORDION_MOTION_PROPS}`。
> ⚠ **风险 + fallback**: HeroUI v2 默认 motion 数值未公开 (01-ANALYSIS §2), 覆盖 motionProps 可能影响其 height auto 行为。implement 实测; 若破坏动画, fallback = 不传 motionProps、接受 HeroUI 默认, 并把"HeroUI 折叠时长与手写侧对齐"降级记入 docs/issues 另行跟踪。

### 迁移点 (8)
| # | 文件 | 组件 | 现状 → 目标 |
|---|---|---|---|
| 1-3 | instructions.tsx | MemoryCard/SkillCard/GenericAssetCard | `{expanded&&}` → `<Collapsible open>`; chevron 统一; trigger 加 aria |
| 4 | capabilities.tsx | McpServerCard | 同上 (保留 focused scrollIntoView+展开) |
| 5 | feature-guide-panel.tsx | FeatureGuidePanel | `{expanded&&hasDetails&&}` → `<Collapsible>`; 已有 rotate chevron |
| 6 | memory-view.tsx | NoteCard | 反向接入 `<Collapsible unmountOnExit>`; **行为不退化** (懒加载/aria/inert/focused/延迟卸载) |
| 7 | memory-view.tsx | TagFilter | 筛选网格 body 接入 `<Collapsible open={showGrid}>` (同文件, 接 #6 后改) |
| 8 | teams.tsx + capabilities.tsx | HeroUI Accordion ×2 | 传 `ACCORDION_MOTION_PROPS` |

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 仅改折叠动画机制, 不改 card 头/详情布局与密度 | 截图对比迁移前后无布局漂移 |
| 组件选择 / 设计系统一致性 | 统一 `<Collapsible>` primitive (ui 层); 动画时长全量走 MOTION token; HeroUI 侧亦对齐 | 6 卡片 + TagFilter 展开节奏一致; 与 teams 观感一致 [AC5] |
| 交互反馈 / 状态切换 | grid-rows 高度过渡 + chevron 旋转过渡 (替换瞬时互换/条件渲染) | 真跑观察展开/收起平滑 [AC2] |
| loading / empty / error / disabled / focus | focus: 迁移保留 SkillCard/GenericAssetCard/McpServerCard/NoteCard 的 focused 自动展开; empty/error 态不经折叠路径 | focused 跳转自动展开回归测试 [AC3] |
| 响应式 / 可访问性 / 键盘可达 | `aria-hidden`+`inert` 收起屏蔽; trigger `aria-expanded`/`aria-controls`; `motion-reduce` 降级; 头部计数项窄屏不溢出 | reduced-motion 分支测试 + 键盘 Tab 走查 [AC1] |
| 文案 / i18n / 数字和路径格式 | 无新增 i18n key (Collapsible 纯结构, 文案由调用方传); chevron 无文案 | 不适用 (无文案变更) |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 备注 |
|---|---|---|---|---|
| Collapsible open 切换 → grid-rows class / aria-hidden / inert | renderer (RTL) | `tests/unit/components/ui/collapsible.test.tsx` (新) | `pnpm test` | AC1 |
| Collapsible reduced-motion 分支 | renderer | 同上 | `pnpm test` | AC1 |
| Collapsible unmountOnExit + 延迟卸载 (fake timer) | renderer | 同上 | `pnpm test` | AC3 NoteCard 懒加载守护 |
| CollapsibleChevron open→rotate class | renderer | 同上 | `pnpm test` | AC2 |
| instructions 三 card 迁移后展开/收起 + focused 自动展开 | renderer | 现有 instructions 测试 (扩) | `pnpm test` | AC2/AC3 |
| McpServerCard 迁移 + focused | renderer | capabilities 测试 (扩/新) | `pnpm test` | AC3 |
| NoteCard 反向接入不退化 (懒加载/aria/focused) | renderer | 现有 memory-view 测试 (扩) | `pnpm test` | AC3 |
| TagFilter 接入后 toggle/外点关闭 | renderer | memory-view 测试 | `pnpm test` | AC2 |
| HeroUI Accordion 传 motionProps 不破坏展开 | manual + renderer smoke | — | 真机实测 | AC5; friction popover-animation 时序 |
| **虚拟列表内展开/收起动画 + 滚动布局正确** | manual CDP | — | electron 实测 | **AC4 关键**; 不可用 unit 代替 (不变量22 + memory runtime-behavior-needs-real-run) |
| 不写自动化的项 | — | — | — | HeroUI motionProps 视觉、虚拟列表滚动正确性 = 真跑/截图 (DOM 高度动画 jsdom 测不出) |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Collapsible primitive + ui 出口 + token + aria/inert/reduced-motion/chevron/延迟卸载 | AC1 |
| instructions 三 card + McpServerCard 迁移有动画 | AC2 |
| NoteCard/TagFilter 反向接入不退化 (有组件测试守护) | AC3 |
| 虚拟列表展开/收起滚动布局正确 (真跑 CDP) | AC4 |
| 节奏与 teams 一致 (含 HeroUI 对齐) | AC5 |

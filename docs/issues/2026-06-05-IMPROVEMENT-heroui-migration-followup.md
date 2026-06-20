# 描述
- GH-105 (Radix→HeroUI 整库重构) 已完成核心迁移: HeroUI v2 采用、全部 @radix-ui+cmdk 移除、共享 `components/ui/` 层、蓝色 primary + 可切换 accent 体系、token 地基(radius/分层/elevation/focus ring)全应用生效、scope/cost-source badges 与 settings dialog 收敛到 HeroUI。
- 以下**长尾视觉/收敛项**不属于核心迁移验收, 为控制收敛期回归风险拆出跟踪 (GH-105 03-PLAN 交叉引用)。

# 重现步骤
- 密集页 section 卡片仍为手搓 `rounded-* border bg-card` 面板, 未统一到 HeroUI Card/CardHeader/CardBody: `pages/overview.tsx`、`pages/usage.tsx`、`pages/capabilities.tsx`、`pages/session-detail.tsx`、`pages/settings.tsx`。
- 原生控件未替换: `components/shared/filter-bar.tsx` 的 ScopeSelect `<select>`; `components/capabilities/hooks-lifecycle-view.tsx` 的 HookActions `<details>` 菜单 → 应迁 HeroUI Select / Dropdown。
- 复杂浮层未收敛: `components/layout/search-dialog.tsx` (命令面板键盘 nav) 与 `components/shared/file-viewer-drawer.tsx` (drag-resize) 仍为手搓 focus-trap → 可迁 HeroUI Modal / Drawer (保留键盘逻辑与拖拽)。
- 手写 hover-popover 未收敛 (GH-116 增补 2026-06-11): `pages/session-detail.tsx` 的 ModelBadge 模型信息卡与 SignalMetric explanation 提示仍为 group-hover CSS 浮层 (无 focus 管理/碰撞翻转) → 迁 HeroUI Tooltip (富内容) / Popover; 原 ToolTimeline 的 ToolTipButton 已随 GH-116 重放重构删除。
- 重复折叠未统一: local-sources-section / agent-capability-plugins-section / session-detail CollapsibleSection / memory NoteCard 各自手搓 chevron 折叠 → 统一 HeroUI Accordion。
- 本地 Badge / 内联 pill 仍散落 (agent-capability-plugins-section 的本地 Badge、project-scope-switcher 状态 pill、session-detail tags 等) → 统一到 `ui/Chip`。
- 微排版残留: 多页仍有 `text-[10px]`/`text-[11px]` → 收敛到 ≥text-xs。
- 主题: settings 其余面板 (Scanning/About/plugins) 未 ui 化; About avatar 仍非品牌蓝。
- bundle: 引入 HeroUI(framer-motion+react-aria) 后 renderer JS 增大 (~3.5MB), 可评估按需 import (`@heroui/<component>`) 与 tree-shaking 优化。

# 预期结果
- 全部页面 section 卡片、控件、折叠、badge 统一消费 `components/ui/` 共享层, 视觉语言与密度一致 (rounded-large + soft elevation + 统一 chip 词汇 + 一致 icon 比例)。
- 无原生 `<select>`/`<details>` 充当菜单; 无手搓 focus-trap。

# 实际结果
- 核心迁移完成且门禁通过, 但上述密集页内容、原生控件、复杂浮层、重复折叠仍为旧实现, 一致性未 100% 拉齐。

# 解决方案
- 分页推进 (overview→usage→capabilities→instructions/memory→session-detail→settings→layout shell), 每页消费 ui/ 层 + 应用 dashboard 语言, 保留 testid/虚拟化/PageChrome/拖拽区/i18n, 每页一提交并截图验收。
- search-dialog/file-viewer-drawer 迁 HeroUI Modal/Drawer 时保留命令面板键盘 nav 与 drag-resize。
- 评估 bundle: 优先 `@heroui/<component>` 按需包 + 确认 tree-shaking。

# 进展
- GH-109 (docs/works/_archive/2026-06-06-gh-109-heroui-handwritten-controls) 已兑现"手写控件"长尾的控件子集: header 搜索 Input、usage cost-mode Select、hooks HookActions Dropdown、memory 标签筛选 Input、filter-bar ScopeSelect/FilterBar Select+Input、agent-plugin 本地 Badge + memory 状态徽标 → Chip; sessions 分组切换器 → Tabs (commit c27c446d)。
- 仍待: section 卡片 → Card、复杂浮层 (search-dialog/file-viewer-drawer) → Modal/Drawer、重复折叠 → Accordion、交互筛选 pill、project-scope/session-detail tags → Chip、settings 其余面板、bundle 按需 import。

# 追记 (GH-115 量化, 2026-06-10)
- ui barrel 63 导出仅 20 被消费 (68% 死面), motion.ts 整模块零引用; Card 全家零消费而页面手搓 33+ 处卡片壳; Switch 零消费而 settings 手搓 role=switch; Tooltip 零消费而 session-detail 3 处 group-hover 手搓 CSS tooltip (与 FloatingPopover/HeroUI Tooltip 三方并存)。
- chevron 折叠实为 8 处 (修正本 issue 原 4 处口径); 节标签 33 处 9 种写法散落 13 文件; 指标瓷砖 6 实现并存; outline 小按钮串 10 处; "在访达中显示" 8 文件重复 → 微 primitive 建议: StatTile/SectionLabel/ActionChipButton/ShowInExplorerButton (01-ANALYSIS R24/R25)。
- 关联新立: 2026-06-10-IMPROVEMENT-expandable-asset-card-convergence.md (资产卡 4 克隆, 与本 issue chevron 项合并执行)。

# 进展 (2026-06-20, Phase-1 scope — 发现前置依赖, 暂缓)
- 关联: expandable-asset-card (#5) 已 v0.4.4 收敛 4 卡片 (保留手动 Collapsible/Chevron, chevron→Accordion 仍归本 issue)。
- **Phase-1 (section 卡片 div→Card, 本应最安全 DOM-preserving 子集) 实测为 no-op**: `ui/Card` 全家是**裸 HeroUI 原语零项目消费**, 与手搓 `rounded-* border border-border bg-card p-*` div 在 6+ 渲染轴发散 (暗色 bg-card vs bg-content1 / shadow-medium / 无 border / body p-3 vs p-4-5 / overflow-hidden+auto 会裁 Recharts / flex-col+transition + rounded-xl≠rounded-large)。裸 swap **非 DOM-preserving** (会引入暗色背景/阴影/边框/留白/裁剪视觉变化), 子代理据 surgical 约束正确地未改任何文件。
- **前置依赖 (解锁 Phase-1 的正解)**: 先在 `components/ui/` 建薄封装 berth `Card` 复合件 —— bake `shadow="none"` + radius 匹配 + `bg-card border-border` + body `p-4/p-5` + 去 overflow 裁剪, 使 div→Card 变 DOM 等价; 之后 swap 才 trivial。复合卡 (usage 643/693/722, plugin-detail 156/171/201 含 CardHeader) 需 Card+CardHeader+CardBody 分解逐个处理。
- **暂缓理由**: 本 issue 为低价值 cosmetic DRY (DOM-preserving = **零用户可见收益**, 仅可维护性); Phase-1 需先建 wrapper + 逐实例视觉验收; 本批优先更高价值在途项 (#6 i18n 契约 / #3 缓存)。本 issue 为显式"分页推进"长尾, 路径已厘清 (建 berth Card wrapper → 逐页 swap + 视觉验收 → 再 Accordion/Popover/typography/bundle 各 phase), 保持 OPEN 待专项推进。

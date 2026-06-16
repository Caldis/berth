# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

## 顺序 / 并行边界
- **T1 必须最先** (其余全部依赖共享组件)。
- **T2 / T3 / T4 / T5 文件互不重叠** (instructions / capabilities / feature-guide-panel / memory-view), T1 后可并行。
- **T6 依赖 T3** (同改 capabilities.tsx, 须 T3 之后) 且依赖 T1。
- **T7 最后** (全量验收)。
- 共享工作区: 每项只暂存自己文件, 完成即提交 (COMMIT_POLICY)。

---

- [ ] **T1 — 共享 Collapsible primitive** (基础, 先行)
  新建 `src/renderer/src/components/ui/collapsible.tsx`: `Collapsible` (受控 grid-rows body 容器 + `aria-hidden`/`inert` + `motion-reduce` + 可选 `unmountOnExit` 延迟卸载) + `CollapsibleChevron` (ChevronRight + `rotate-90` 过渡); `components/ui/motion.ts` 新增 `ACCORDION_MOTION_PROPS`; `@/components/ui` 出口导出三者。
  - tests: `tests/unit/components/ui/collapsible.test.tsx` (新) — open 切换 → grid-rows/opacity class + aria-hidden + inert; reduced-motion 分支; unmountOnExit + 延迟卸载 (fake timer); chevron rotate class。
  - verify: `pnpm test` 绿; props 契约符合 02-SPEC; 不适用界面截图 (纯 primitive, 由迁移点体现)。

- [ ] **T2 — instructions 三 card 迁移** (依赖 T1)
  MemoryCard/SkillCard/GenericAssetCard: `{expanded&&<div>}` → `<Collapsible open>`; chevron 换 `CollapsibleChevron`; trigger 加 `aria-expanded`/`aria-controls`。
  - tests: instructions renderer 测试扩展 — 展开/收起; SkillCard/GenericAssetCard focused 跳转自动展开回归。
  - verify: 截图展开/收起有高度过渡 + chevron 旋转 (界面质量"交互反馈"); focused 自动展开正常 ("focus" 行); 头部布局无漂移 ("布局层级")。

- [ ] **T3 — capabilities McpServerCard 迁移** (依赖 T1; 与 T2/T4/T5 可并行)
  McpServerCard `{expanded&&}` → `<Collapsible open>`; chevron 统一; 保留 focused `scrollIntoView`+展开 (`capabilities.tsx:89-93`)。
  - tests: capabilities renderer 测试 (新/扩) — 展开/收起 + focused 自动展开。
  - verify: 同 T2 视觉项; McpServerCard focused 行为不退化。

- [ ] **T4 — feature-guide-panel 迁移** (依赖 T1; 可并行)
  FeatureGuidePanel `{expanded&&hasDetails&&}` → `<Collapsible open>`; 现有 `rotate-180` chevron 是否换 `CollapsibleChevron` 留 verify taste。
  - tests: feature-guide-panel 测试 (新/扩) — expanded 切换显隐 details。
  - verify: 展开详情有高度过渡 (现状无); button focus ring 保留; chevron 方向 taste 交用户。

- [ ] **T5 — memory-view NoteCard 反向接入 + TagFilter 纳入** (依赖 T1; memory-view 独占, 内部顺序: 先 NoteCard 后 TagFilter)
  NoteCard 用 `<Collapsible unmountOnExit>` 替换其手写 grid-rows + detailsMounted/timer (**行为不退化**: 懒加载 body、aria/inert、focused 自动展开、reduced-motion、延迟卸载全保留); TagFilter 筛选网格 body 接 `<Collapsible open={showGrid}>` (保留外点关闭、aria-expanded)。
  - tests: memory-view 测试扩展 — NoteCard 懒加载+focused 不退化 (现有测试须仍绿); TagFilter toggle/输入显隐/外点关闭。
  - verify: NoteCard 与迁移前观感/行为一致; TagFilter 展开网格过渡平滑。

- [ ] **T6 — HeroUI 侧对齐 MOTION token** (依赖 T1 + T3)
  teams.tsx Accordion (`105`) + capabilities PluginCard Accordion (`274`) 传 `motionProps={ACCORDION_MOTION_PROPS}`。
  - tests: renderer smoke (motionProps 不报错 + 仍可展开); height 动画时长 manual 实测 (jsdom 测不出)。
  - verify: teams/PluginCard 展开节奏与手写侧一致 [AC5]; **若实测破坏 height auto → fallback 不传 motionProps + 记 docs/issues**, 当任务此项标记 fallback 完成。

- [ ] **T7 — 全量真跑验收** (最后)
  CDP 真跑约定页 (instructions) 在 `VirtualGroupedList` 内展开/收起多个 card: 观察动画平滑 + 虚拟列表滚动布局无错位/跳变 [AC4]; 跨 6 卡片 + TagFilter + teams 截图核对节奏一致。
  - tests: manual CDP 时序观察 (不变量22 + memory `runtime-behavior-needs-real-run`); 动画 settle 后再断言 (friction `20260611-...-popover-animation-click-race`)。
  - verify: 展开/收起后滚动位置正确无跳变; **截图请用户确认折叠动画质感 + chevron 方向 taste** (不变量22 主观视觉用户裁判)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

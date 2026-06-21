# IMPROVEMENT: 多选/filter-chip 类控件收敛 (SegmentedTabs 之外的剩余分段族)

状态: OPEN (中优, 非阻塞)

## 背景
分段控件收敛专项已落地 `SegmentedTabs` (薄封装 HeroUI Tabs 纯选择器, 同心圆角 + 滑块动画 + a11y, 见 commits 9a779dbd 起 批1–批4), 把**单选 segmented pill** 全部统一: dashboard 尺寸/累计指标/时间范围/skill·mcp/图表形态 + usage 页范围 + session 筛选条 agent/groupBy。

但全量盘点 (renderer 15 处) 里还有一族**语义不同**的控件未收敛, 不适合直接套 `SegmentedTabs` (单选 Tabs):

| 控件 | 位置 | 语义 | 现状 |
|---|---|---|---|
| 标签筛选 | `components/memory/memory-view.tsx` (~571) | **多选** (`Set` tagFilter) | 手写 `rounded-full border` chip + 计数 |
| 来源筛选 | `components/memory/memory-view.tsx` (~438) | 单选 (activeSource) | 同上 rounded-full chip |
| scope 筛选 | `pages/instructions.tsx` (~322) | 单选 (scope) | 同上 rounded-full chip + 计数 |

这些是 **filter-chip 模式** (rounded-full 药丸 + 计数, 可多选), 与 segmented pill (单选、滑块切换) 视觉与交互都不同; 多选更无法用单选 Tabs 表达。

## 建议
- 抽一个兄弟组件 `FilterChips` (基于已有 `@/components/ui` 的 `Chip` 复合件), 统一: chip 圆角/选中态/计数排版/键盘可达性; 支持单选与多选 (`selectionMode`)。
- 用它收敛上述 3 处, 消除各自手写的 rounded-full chip 重复与样式漂移。
- 验收: 三处 filter-chip 外观一致; 多选 (memory tags) 往返正确 (选中→再切回, 参考 `_shared.md` 不变量 22 的筛选控件往返验收); typecheck/lint/test 绿。

## 不在本族但相关 (已另记)
- `pages/session-detail.tsx` 的 Tabs 是**带面板的真 tab 导航** (overview/replay/artifacts), 非分段选择器, 保持 HeroUI Tabs 原样, 不收敛。
- gh project CLI scope-gate 假阴性 + `harness-projects.mjs` 改走 GraphQL 的 tooling follow-up 见 friction `20260621-0.0-new-gh-project-scope-gate-false-negative`。

## 来源
分段控件收敛专项 (2026-06-22) explore 全量盘点时识别为同类但不同模式的剩余项; 单选 segmented 已在本专项收敛, filter-chip 族按不变量 10 交叉引用记录, 留作独立后续, 不混入本批。

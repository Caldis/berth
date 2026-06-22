---
task: 2026-06-22-gh-150-overview-drag-ux-overhaul
task_id: GH-150
type: feature
phase: design
created: 2026-06-22
priority: P1
target_date:
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 5
    repaid: 2
    net: 3
    scope: module
    risk: medium
    areas:
      - ui-ux
      - performance
    confidence: medium
    rationale: "explore 已坐实四项根因 (dnd-kit rectSortingStrategy 的 scale transform / 无 memo + recharts 全树重渲染 / show 无聚焦 / 连续 masonry 高度); 影响面跨 dashboard grid+shell+layout+16 widget, 布局模型由连续 masonry 替换为固定档位 uniform grid; net 待 design 校准。"
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions:
    - phase: explore
      date: 2026-06-22
      field: confidence
      from: low
      to: medium
      reason: "四项根因已用源码/代码坐实; blast radius 符号边界确认闭环在 dashboard 模块 (无外部消费者)。net 维持 3, scope=module 不变。"
issue:
  number: 150
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/150
  id: I_kwDOSpnDwc8AAAABGO6dsQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwa7Js
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 总览拖拽体验大修 (性能 / 变形 / 新增聚焦 / 固定档位布局)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 续跑指南
- 当前 phase: **design** (explore 完成, 01-ANALYSIS 已落盘 + 验收标准 AC-1..AC-9 编号)。
- 下一步: `harness-2.0-design` — 出固定档位方案 (基础行高单元 / 各 widget 高度档 / 宽度档 / md·xl 断点换算) + DragOverlay 重构 + 性能方案, 写 02-SPEC.md + 测试矩阵。档位核心参数需用户 checkpoint (见 01-ANALYSIS 未决问题 1); design 前按不变量 9 先查 dnd-kit DragOverlay 官方文档。
- 用户已确认决策 (写入约束, 不再问): ①整体一个大件一次性重构 (不单独先发止血); ②超档内容策略 = 截断 + 查看更多。

## 范围 (四项)
1. 修拖拽变形 (dnd-kit scale transform → CSS.Translate 丢 scale; 档位化后同档等尺寸根治)。
2. 极致拖拽性能 (DragOverlay 解耦 recharts 重渲染 + React.memo + useCallback 稳定回调; 真跑 profile 实测帧率)。
3. 新增 widget 滚动聚焦 + 短暂高亮。
4. 布局档位化 (连续 masonry 高度 → 固定档整数倍 uniform grid; 超档 = 截断 + 查看更多)。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
(无)

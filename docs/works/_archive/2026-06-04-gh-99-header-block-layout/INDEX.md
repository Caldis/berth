---
task: 2026-06-04-gh-99-header-block-layout
task_id: GH-99
type: maintenance
phase: archive
created: 2026-06-04
priority: P2
target_date:
maintenance:
  subtype: ui-ux
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/99
debt:
  estimate:
    incurred: 2
    repaid: 5
    net: -3
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "悬浮 header 测高/偏移补偿机制集中在布局外壳 (app-layout/top-navigation) + 两个 sticky 消费者 (category-jump-nav/hooks-lifecycle-view) + 对应测试; 改块布局可移除 ResizeObserver 测高、--berth-page-top-offset 间接层、paddingTop/scrollPaddingTop 补偿, 净偿还。风险 medium: 全局布局所有页面依赖, 但改动机械。explore/design 后校准。"
  final:
    incurred: 1
    repaid: 7
    net: -6
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: high
    rationale: "核心 diff 净 -4 行, 纯删减: 移除 ResizeObserver 测高 effect、onHeightChange 回调、topNavigationHeight state、运行时 --berth-page-top-offset 注入; --berth-page-top-offset 降为静态常量; 两个 sticky rail 各只改 top。6 路由页零改动。Polish C1+C2 再清理两处重构孤儿 (失效 transition background-color、冗余 relative), repaid 5->7。typecheck/lint/全量测试 (90 文件/652)/全局 harness:check 全绿; 实测 6 类路由 + sticky 滚动钉附通过。"
  revisions:
    - phase: explore
      date: 2026-06-04
      from: { net: -3, confidence: low }
      to: { net: -3, confidence: medium }
      reason: "并行逐页审计确认 6 个路由页本体零改动, 改动面收敛到 6 文件 + ~6 测试; net 不变, confidence low->medium。"
    - phase: verify
      date: 2026-06-04
      from: { net: -3, risk: medium, confidence: medium }
      to: { net: -4, risk: low, confidence: high }
      reason: "实现完成后校准 final: 实际为纯删减 (净 -4 行), 全量门禁绿; 风险 medium->low, confidence medium->high。"
    - phase: polish
      date: 2026-06-04
      from: { net: -4 }
      to: { net: -6 }
      reason: "用户勾选 polish C1+C2 (清理 transition background-color 孤儿 + 移除冗余 relative), 各偿还 1; phase 临时回 implement 执行, 完成后 final 校准 repaid 5->7。"
issue:
  number: 99
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/99
  id: I_kwDOSpnDwc8AAAABEZADIQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguvML0
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 重构应用 header 为普通块布局, 移除悬浮补偿机制

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [x] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

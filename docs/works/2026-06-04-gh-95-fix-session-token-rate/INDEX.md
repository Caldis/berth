---
task: 2026-06-04-gh-95-fix-session-token-rate
task_id: GH-95
type: bug
phase: verify
created: 2026-06-04
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/95
debt:
  estimate:
    incurred: 4
    repaid: 0
    net: 4
    scope: module
    risk: medium
    areas:
      - ui-ux
      - testability
    confidence: medium
    rationale: "用户新增改名、长期会话分段和 hover 公式透明要求; 影响 sessions:get activity metrics、IPC 字段、Session Detail 展示和测试。"
  final:
    incurred: 3
    repaid: 2
    net: 1
    scope: module
    risk: low
    areas:
      - ui-ux
      - testability
    confidence: high
    rationale: "修复集中在 sessions:get activity metrics 与 Session Detail: token 速率改名为本地 token 消耗速率, 按最近活动窗口计算, 长空闲自动分段, hover 展示公式。剩余 net=1 来自该指标仍是本地 transcript 估算, 不是官方 telemetry。"
  revisions:
    - phase: explore
      date: 2026-06-04
      from:
        confidence: low
      to:
        confidence: medium
      reason: "已定位异常来自主进程 token rate 生成逻辑, 不是跨 parser 或 renderer 布局问题。"
    - phase: verify
      date: 2026-06-04
      from:
        incurred: 3
        net: 3
        rationale: "explore/design 确认影响面集中在 sessions:get activity metrics 和测试; 不改 parser、IPC 类型或页面布局。"
      to:
        incurred: 4
        net: 4
        rationale: "新增 token 消耗速率命名、最近活动窗口和 hover 公式说明; 需要扩展 IPC 透明字段与 renderer 交互。"
      reason: "用户要求改名策略并确保计算公式透明, hover 可视化呈现计算逻辑。"
issue:
  number: 95
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/95
  id: I_kwDOSpnDwc8AAAABERdLdA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguoZdo
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Fix Session Token Rate

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始缺陷描述快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

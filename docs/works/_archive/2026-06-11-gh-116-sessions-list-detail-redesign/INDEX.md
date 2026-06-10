---
task: 2026-06-11-gh-116-sessions-list-detail-redesign
task_id: GH-116
type: feature
phase: archive
created: 2026-06-11
priority: P2
target_date: 
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 8
    repaid: 3
    net: 5
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 校准: 重放需要 shared 类型 → adapters 解析 → engine → IPC 四方 → renderer 纵向切面 (scope 升 cross-process, incurred 8); 同批替换自绘 tab/hover-popover 为 HeroUI 原生、删 timeline 专属 CSS、detail 接 AssetFileCache 还性能债 (repaid 3)。"
  final:
    incurred: 8
    repaid: 3
    net: 5
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
    confidence: high
    rationale: "verify 实测后定稿: 重放纵向切面落地 (shared 类型/双 adapter 解析/engine 缓存/IPC 双通道/重放 UI/列表重设计), 新增 ~2200 行 + 测试 28 个新用例; repaid 兑现 (自绘 tab→HeroUI 原生、删 ToolTimeline+专属 CSS ~400 行、detail/replay 双指纹缓存)。残余风险: 大 transcript 首次解析仍在主进程主线程 + 重放缓存无逐出 (已并档 streaming-parse issue), 真机 989/276 事件双 agent 重放 217ms/115ms 可接受。"
  revisions:
    - phase: explore
      date: 2026-06-11
      from: "incurred 5 / repaid 2 / net 3 / scope module / confidence low"
      to: "incurred 8 / repaid 3 / net 5 / scope cross-process / confidence medium"
      reason: "重放功能需扩展 session 事件数据链 (shared 类型/adapters 解析/engine/IPC 四方/renderer), 影响面跨进程; 同批以 HeroUI 原生件替换自绘 tab 与 hover-popover、补 detail 缓存, repaid 上调。"
issue:
  number: 116
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/116
  id: I_kwDOSpnDwc8AAAABFCi-MQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvVVog
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 会话功能列表页与详情页全面重设计

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

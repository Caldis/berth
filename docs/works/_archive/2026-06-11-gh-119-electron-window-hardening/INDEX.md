---
task: 2026-06-11-gh-119-electron-window-hardening
task_id: GH-119
type: maintenance
phase: archive
created: 2026-06-11
priority: P1
target_date: 
maintenance:
  subtype: architecture
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-10-IMPROVEMENT-electron-window-hardening.md
debt:
  estimate:
    incurred: 1
    repaid: 4
    net: -3
    scope: cross-process
    risk: medium
    areas:
      - architecture
    confidence: medium
    rationale: "explore 校准 (2026-06-11): 六缺口全部代码实勘 + 官方契约确认 (sandboxed preload require 白名单 + electron-vite bundle 解法 + preload 产物已 CJS); 两处输入修正 (openPath 实为 showItemInFolder; permission 合法集合非空, 须放行 clipboard-sanitized-write)。数值维持 incurred 1 / repaid 4 / net -3。"
  final:
    incurred: 1
    repaid: 4
    net: -3
    scope: cross-process
    risk: low
    areas:
      - architecture
    confidence: high
    rationale: "verify 收口 (2026-06-11): 六缺口全消 (sandbox:true/出口双白名单/导航守卫/权限 deny-all 例外 clipboard/CSP 三指令), 判定层 29 unit + 行为层 hardening e2e 5 + 现有 e2e 回归 + CDP 真机 12 项 (含三方并集三分支端到端) 全绿; CI success。剩余风险仅 win32 e2e 宿主隔离预存项 (独立 issue, 非本任务引入)。"
  revisions:
    - phase: explore
      date: 2026-06-11
      from: "confidence low"
      to: "confidence medium"
      reason: "六缺口实勘 + 官方契约确认; 数值与 scope/risk 维持不变。"
    - phase: verify
      date: 2026-06-11
      from: "risk medium / confidence medium"
      to: "risk low / confidence high"
      reason: "全 AC 自动化+真机闭环 (unit/e2e/CDP 三层), sandbox 链路经 25 e2e + dev 实例双形态实证; 数值不变。"
issue:
  number: 119
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/119
  id: I_kwDOSpnDwc8AAAABFKk6RA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvcfLI
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Electron 窗口装配层安全加固

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

defense-in-depth 一批落地: sandbox:true + preload exclude 打包、`main/url-guard.ts` 出口校验单点 (openExternal 协议白名单 / openPath 扫描根集合 / setWindowOpenHandler 共用)、will-navigate 守卫、permission handler deny-all、CSP 次级指令补齐。

## 产物
- [x] 00-PRD.md — 原始输入快照 (来源 issue 全文)
- [x] 01-ANALYSIS.md — Explore 产物 (六缺口实勘 + 官方契约 + AC1-9)
- [x] 02-SPEC.md — Design 产物 (纯谓词契约 + 装配契约 + 测试矩阵, Q1-Q3 消解)
- [x] 03-PLAN.md — 活任务清单 (T1-T5 顺序执行)
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

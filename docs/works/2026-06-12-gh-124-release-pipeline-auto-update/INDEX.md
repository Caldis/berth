---
task: 2026-06-12-gh-124-release-pipeline-auto-update
task_id: GH-124
type: feature
phase: explore
created: 2026-06-12
priority: P1
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/124
debt:
  estimate:
    incurred: 4
    repaid: 1
    net: 3
    scope: cross-process
    risk: high
    areas:
      - tooling-ci
    confidence: low
    rationale: "0.0-new 初始估算: release workflow (+1) + updater main 装配/IPC 契约/renderer UI/偏好 (+3, 新功能面); 还掉'发布只能本机手打'约束 (-1)。scope cross-process (workflow + main + preload + renderer + builder 配置); risk high — 自动更新链路 (latest*.yml/签名约束/下载安装) 真实验证依赖 Release 实弹, mac 未签名对 updater 的限制待核。explore/design 后校准。"
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions: []
issue:
  number: 124
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/124
  id: I_kwDOSpnDwc8AAAABFQjtYg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvhq3E
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# CI 发布流水线 + 自动更新 (GH-124)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

参考 bobcorn: ① release.yml 三阶段 (test gate → 三平台 matrix → 齐验统一发布含 latest*.yml); ② electron-updater 自动更新 (publish github + main 装配 + IPC 四方同批 + renderer UI/偏好)。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

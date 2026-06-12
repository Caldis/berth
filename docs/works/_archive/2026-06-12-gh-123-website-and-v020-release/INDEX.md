---
task: 2026-06-12-gh-123-website-and-v020-release
task_id: GH-123
type: feature
phase: archive
created: 2026-06-12
priority: P1
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/123
debt:
  estimate:
    incurred: 1
    repaid: 0
    net: 1
    scope: module
    risk: medium
    areas:
      - docs
    confidence: medium
    rationale: "0.0-new 初始估算: 官网四语言内容更新 + 版本发布脚手架 (+1, 内容维护面); 无还债目标。scope module (website + package.json + release); risk medium — 外发动作 (GitHub Release 公开 / 官网自动上线), 且 mac 资产存在跨设备物理约束。explore 后校准。"
  final:
    incurred: 1
    repaid: 0
    net: 1
    scope: module
    risk: low
    areas:
      - docs
    confidence: high
    rationale: "verify 收口: AC1-6 全过 (版本两处/四语 12+24 处内容/deploy 根修+线上 v0.1 归零/win 三资产冒烟/Release Latest/CI 绿); 额外交付 deploy-website 自 06-07 红灯根修。mac 资产待用户 mac 机后补。"
  revisions:
    - phase: explore
      date: 2026-06-12
      from: "confidence low"
      to: "confidence medium"
      reason: "更新面全站扫描收口 (版本单源 + 四语漂移 4 处); 数值维持。"
issue:
  number: 123
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/123
  id: I_kwDOSpnDwc8AAAABFP7Jew
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvhBzY
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 官网更新 + v0.2.0 发布

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

自 v0.1.1 (2026-06-04) 以来 GH-105~122 变更萃取 → release notes + 官网四语言特性同步; 版本 bump 0.2.0; GitHub Release 带本机 win 安装包 (mac arm64 资产用户在 mac 机后补, 物理约束); 官网 push 后 deploy-website.yml 自动上线。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物 (AC1-6)
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单 (T1-T4)
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

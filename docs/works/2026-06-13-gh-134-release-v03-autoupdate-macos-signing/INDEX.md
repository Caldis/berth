---
task: 2026-06-13-gh-134-release-v03-autoupdate-macos-signing
task_id: GH-134
type: feature
phase: explore
created: 2026-06-13
priority: P1
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/134
    - docs/works/_archive/2026-06-12-gh-124-release-pipeline-auto-update
    - docs/issues/resolved/2026-06-04-IMPROVEMENT-macos-release-signing-config.md
    - D:/Code/bobcorn
debt:
  estimate:
    incurred: 5
    repaid: 2
    net: 3
    scope: cross-process
    risk: high
    areas:
      - tooling-ci
    confidence: low
    rationale: "release/CI + 代码签名/公证为主 (tooling-ci), 跨 main updater / renderer 设置 / electron-builder / release.yml / Apple secrets; 本机 Windows 无法跑 mac 签名打包, 全链验证依赖 macOS runner + Apple 凭据, 故 risk=high confidence=low。修复 macОС 签名缺口偿还既有 signing debt (repaid=2)。explore/design 后校准。"
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
  number: 134
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/134
  id: I_kwDOSpnDwc8AAAABFX9zWw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvoO4o
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# GH-134 — Release v0.3: 自动更新开关 + 签名 macOS zip 发布

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 任务范围 (三项)
1. 自动更新开关: 自动检查 (auto-check) + beta 渠道 (allowPrerelease) 等, 持久化偏好并接线 autoUpdater。
2. macOS 签名 zip 发布: GitHub Release 增加签名后的 mac zip; 签名+公证参考 bobcorn (CSC_LINK/APPLE_*); 落地后解除 updater `platformLimited` 降级。
3. 版本 bump 0.2.0 → 0.3.0 并发布。

## 待澄清 (blocked 时填)

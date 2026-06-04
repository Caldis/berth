---
task: 2026-06-05-gh-105-radix-to-heroui-redesign
task_id: GH-105
type: feature
phase: verify
created: 2026-06-05
priority: P1
target_date: 
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 16
    repaid: 10
    net: 6
    scope: global
    risk: high
    areas:
      - ui-ux
      - architecture
      - dependency
    confidence: medium
    rationale: "explore 校准: Radix 机械面远小于初判 (仅 2 文件 + 9 死依赖), 真实范围偏 ui-ux/architecture — 采用 HeroUI v2 (新增 framer-motion+react-aria 重依赖) + 沉淀共享 DS 封装层 + 7 页/~30 组件视觉重构 + 主题/accent 体系 + 动画补全; consolidation (删 9 死依赖、合并 3 处 focus-trap modal/4 处 accordion/多处 badge) 偿还可观 ui-ux 债。"
  final:
    incurred: 15
    repaid: 8
    net: 7
    scope: global
    risk: medium
    areas:
      - ui-ux
      - architecture
      - dependency
    confidence: high
    rationale: "核心迁移交付并验证: HeroUI v2 + Provider + Tailwind 插件 + accent 体系 + 共享 ui/ 层; 移除 10 Radix + cmdk; session-detail Tabs / category-jump-nav / scope+cost-source badges / settings dialog 收敛到 HeroUI; 全应用经 globals.css token 获蓝 primary/大圆角/深分层/统一 focus ring。incurred=新增 framer-motion+react-aria 重依赖 + HeroUI v2 维护线 + 双 token 桥接; repaid=11 依赖清理 + ~50 行 focus-trap 去重 + 共享 DS 层 + badge 统一 (低于估算 10, 因 3 modal/4 accordion 全量收敛与逐页深度 restyle 拆到 follow-up issue)。门禁全绿 (typecheck/lint/670+ test/build), Electron 截图验收 dark + accent 切换。"
  revisions:
    - phase: explore
      date: 2026-06-05
      from: { incurred: 13, repaid: 5, net: 8, confidence: low }
      to: { incurred: 16, repaid: 10, net: 6, confidence: medium }
      reason: "Radix 真实使用面仅 2 文件 + 9 死依赖 (远小于初判 266 处); 真实工作量在 HeroUI v2 采用 + 共享 DS 层沉淀 + 全应用视觉/主题/动画重构。incurred 上调 (重依赖+迁移面), repaid 上调 (死依赖清理 + 大量重复收敛)。"
    - phase: verify
      date: 2026-06-05
      from: { incurred: 16, repaid: 10, net: 6, confidence: medium }
      to: { incurred: 15, repaid: 8, net: 7, confidence: high }
      reason: "核心迁移交付并验证。repaid 下调 (3 modal 仅收敛 settings-dialog, 4 accordion 与逐页深度 restyle 拆到 docs/issues follow-up); net 略升。risk 降 medium (核心稳定, 门禁全绿)。"
issue:
  number: 105
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/105
  id: I_kwDOSpnDwc8AAAABEaD41g
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguwIPw
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Radix UI → HeroUI 整库重构: 设计系统统一、主题/强调色增强、过渡动画补全

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

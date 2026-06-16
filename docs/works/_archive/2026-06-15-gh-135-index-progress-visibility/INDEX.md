---
task: 2026-06-15-gh-135-index-progress-visibility
task_id: GH-135
type: feature
phase: archive
created: 2026-06-15
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md
debt:
  estimate:
    incurred: 12
    repaid: 0
    net: 12
    scope: cross-process
    risk: high
    areas:
      - architecture
      - ui-ux
    confidence: medium
    rationale: "explore 三次范围扩张定型: B 策略周期调度 + 全参数 UI 可配 + 扫描内核独立 helper 进程 (utilityProcess, 用户拍板) + engine 单一真源/GUI 纯投影数据流重构。~22 文件 multi-process。risk high (进程架构变动 + 真源跨进程迁移 + 原生模块 helper 加载 + 取消/重置数据安全 + 业务逻辑上提 engine)。缓冲: runtime/sqlite-store 已 electron-free (迁 helper 顺), controls[] 已是可配框架, helper 并掉母 FEATURE 长驻 worker 主线 (含 repaid)。"
  final:
    incurred: 15
    repaid: 6
    net: 9
    scope: cross-process
    risk: medium
    areas:
      - architecture
      - ui-ux
    confidence: high
    rationale: "全 B 策略 + 全参数 UI + helper utilityProcess 迁移 + engine 单一真源重构全部落地并真机验证 (F2 e2e pause/resume/rebuild + F3 崩溃自愈 respawn + F4 OS 节流 taskpolicy spike 通过), 高风险架构项已证实可工作 → risk high→medium (剩余风险是 3 进程维护面 + 下沉 issue, 非未证设计)。incurred 15 高于 estimate 12: implement 阶段 /goal 追加 G1 计数 bug + G2-G7 (指标 modal 虚拟表/状态 chip/去噪/扫描历史 recharts 趋势) + CLI 全命令补全 (12 命令 + manual) + 4 增强 + 5 样式修复, UI/CLI 表面显著扩张; 另 6 项下沉为 tracked issue (excludePaths adapter 入口剔/respectGitignore/batchPauseMs 测/逐文件进度/蓝字灰底手写残留/windows 节流)。repaid 6: engine 单一真源消除 GUI fold 业务逻辑 (store 退纯投影) + helper 并掉母 FEATURE 长驻 worker 主线 + 蓝字灰底 TS+ESLint 护栏根治复发类。"
  revisions:
    - phase: explore
      date: 2026-06-15
      from: 5
      to: 12
      reason: "范围由 /goal + 对话三次扩张: 完整 B 策略周期调度 + 全参数 UI 可配 + 扫描内核 helper 进程迁移 + engine 单一真源数据流重构。blast radius 19→22 文件 multi-process, risk medium→high, architecture 升为主 area。"
    - phase: implement
      date: 2026-06-16
      from: 12
      to: 9
      reason: "高风险架构 (helper 迁移/崩溃自愈/OS 节流/cancel·rebuild 数据安全/跨进程真源) 全部落地且真机 spike + e2e 验证通过, risk high→medium。incurred 12→15: implement /goal 追加 G1-G7 + CLI 全补全 + 4 增强 + 5 样式, 6 项下沉 issue。repaid 0→6: 单一真源消 GUI fold + helper 并母 FEATURE worker 主线 + 蓝字灰底 TS/ESLint 护栏。net 12→9。"
issue:
  number: 135
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/135
  id: I_kwDOSpnDwc8AAAABFdzzFg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvvL4s
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 索引引擎进度可视化与可控性 (可预期 / 可中断 / 可重置)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

母 FEATURE 切片: 本任务推进 `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md` 的 OPEN 主线剩余 (T4 可暂停/可控 + 设置档位 + 可观测性深化)。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

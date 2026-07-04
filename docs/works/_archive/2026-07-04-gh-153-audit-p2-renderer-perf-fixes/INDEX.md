---
task: 2026-07-04-gh-153-audit-p2-renderer-perf-fixes
task_id: GH-153
type: bug
phase: archive
created: 2026-07-04
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - GH-151
    - GH-152
debt:
  estimate:
    incurred: 2
    repaid: 3
    net: -1
    scope: module
    risk: medium
    areas:
      - performance
      - architecture
    confidence: high
    rationale: "九项渲染层修复 (证据 = 2026-07-04 审查渲染层子报告, 快照见 00-BUG): 多为局部小修 (原子 selector/push/deferredFilter/吞错 setError/MOTION token), 中等三项 (usage.summary 去重+costMode 复用、health force 绕在途、session-detail keyed CachedResource)。incurred: CachedResource 扩展 (force 语义/keyed detail) 新代码; repaid: 消除 5 路同参重 IPC、usage 页复制粘贴 DRY 违规、O(n²) 分组、布局根全量订阅。scope=module (全部在 src/renderer, 不动 main/IPC 契约); risk=medium (use-ipc.ts 是全页面共享热路径)。confidence=medium, explore 核实 CachedResource 语义后校准。"
  final:
    incurred: 2
    repaid: 3
    net: -1
    scope: module
    risk: medium
    areas:
      - performance
      - architecture
    confidence: high
    rationale: "T1-T8 共 8 个实现提交, 与 estimate 一致。incurred: forceRequest 新原语 + usage keyed 缓存新机制; repaid: 消 5 路同参重 IPC、usage 页复制粘贴、O(n²) 分组、布局根全量订阅 (useAssets 孤儿 API 同批删除净减代码)、4 处吞错、动效魔数。测试先红后绿为主 (T1 characterization/T7 grep+回归, 例外已记); 全仓 189 文件 1370 测试绿, CI 661355e2 三平台 success。真机 CDP 时序验收: 缓存命中三帧零骨架、扫描中页面切换流畅、usage 往返 126ms 即时、编辑态动效无回归。剩余风险: health force 无 UI 入口 (旁支 issue 已记, 机制层已修)。"
  revisions:
    - phase: design
      date: 2026-07-04
      field: confidence
      from: medium
      to: high
      reason: "explore 九项证据全核实 + B3 唯一调用点关键发现; design 锁定 D1-D5 (keyed CachedResource/bootstrap 收形/forceRequest 链后/token 吸收/normalize 留页面), 全部有仓内先例。数值与 scope/risk 不变。"
issue:
  number: 153
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/153
  id: I_kwDOSpnDwc8AAAABHppvtA
  state: OPEN
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgxusGU
  item_status: Done
---

# 综合审查修复批次三 (P2 渲染层): usage 取数去重复用 / 订阅粒度 / 分组复杂度 / 吞错与动效 token 九项

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照 (渲染层审查子报告全文 + 本批范围标注)
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物 (D1-D5 裁决)
- [x] 03-PLAN.md — 活任务清单 (T1-T8 + 收口)

## 待澄清 (blocked 时填)

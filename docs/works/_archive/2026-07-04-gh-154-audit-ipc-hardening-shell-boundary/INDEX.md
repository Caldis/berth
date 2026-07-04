---
task: 2026-07-04-gh-154-audit-ipc-hardening-shell-boundary
task_id: GH-154
type: bug
phase: archive
created: 2026-07-04
priority: P2
target_date:
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-07-04-IMPROVEMENT-audit-remaining-batches-ipc-hardening-and-p3.md
    - GH-151
    - GH-152
    - GH-153
debt:
  estimate:
    incurred: 2
    repaid: 4
    net: -2
    scope: module
    risk: medium
    areas:
      - architecture
    confidence: high
    rationale: "七项 (输入为耐久清单, 无行号证据, explore 需全量核实): 机制四项 (typed registerHandler/typed emit/sender 校验/双向对账) 是类型层与测试层加固, incurred 为新契约推导机制; 偿还编译期类型漂移与 mock 单向对账盲区。shell 两项 (realpath/scheme 白名单) 为安全正确性小修。正则加固面未知 (grep 后定量)。scope=cross-process (main/preload/renderer 类型链 + 契约表); risk=medium (registerHandler 泛型化触所有 handler 签名, 但行为不变纯类型层)。confidence=low — 待 explore 核实各项现状后校准。"
  final:
    incurred: 2
    repaid: 4
    net: -2
    scope: module
    risk: medium
    areas:
      - architecture
    confidence: high
    rationale: "T1-T5 共 6 个实现提交 (T4 含一次提取面补正), 与 explore 修正后 estimate 一致。incurred: typed-ipc 新机制 (handleIpc/sendToWindow/门禁) + realpath 谓词; repaid: 43 通道类型漂移面、sender 纵深缺口、mock 签名层 (GH-115 T2 TODO 兑现)、memory 索引静默丢条目、openPath symlink 绕过。先红后绿为主 (T5 为 typecheck 红名单驱动); 全量 1382 测试绿; 冷启动 smoke 门禁/deny/推送三面真机验证。过程新 friction: 提取型对账空集空洞通过 (已钉非空)。"
  revisions:
    - phase: explore
      date: 2026-07-04
      field: incurred/repaid/net/scope/confidence
      from: "3/3/0, cross-process, low"
      to: "2/4/-2, module, medium"
      reason: "七项逐一核实, 两项状态修正: ⑦ openExternal scheme 白名单 GH-119 已实现 (出批); ④ mock 结构层已被 satisfies mapped-type 双向闭环, 收窄为签名层 (satisfies BerthAPI)。⑤ 子代理定量: 仅 1 硬命中 + 2 豁免补注。renderer/preload/engine 零改动 → scope 收窄 module。"
    - phase: design
      date: 2026-07-04
      field: confidence
      from: medium
      to: high
      reason: "design 锁定 D1-D5 (typed-ipc 模块/门禁集成/emit helper/mock satisfies BerthAPI/malformed 整体回退/realpath 注入谓词), 全部有仓内先例 (preload typed invoke / parseUnitedIndex onMalformed / GH-152 domain-log)。数值与 scope/risk 不变。"
issue:
  number: 154
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/154
  id: I_kwDOSpnDwc8AAAABHp1F4w
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
  item_id: PVTI_lAHOADXbEs4BZHvQzgxu25Q
  item_status: Done
---

# 综合审查修复批次四: IPC 机制加固 + shell 边界七项

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照 (issues 清单条目 1-7 + 范围裁定)
- [x] 01-ANALYSIS.md — Explore 产物 (七项核实, ⑦ 出批 / ④ 收窄)
- [x] 02-SPEC.md — Design 产物 (D1-D5 裁决)
- [x] 03-PLAN.md — 活任务清单 (T1-T5 + 收口)

## 待澄清 (blocked 时填)

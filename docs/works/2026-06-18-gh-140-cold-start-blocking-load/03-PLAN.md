# 任务清单 (Design 产物 / 活清单)

范围 A。核心是 engine 单方法 (`runtime.ts` `ensureReady`) 语义修复 + 测试, **顺序执行** (状态机方法, 测试与实现强耦合, 不并行)。

- [ ] 任务 1: 为 ensureReady SWR 行为写单测 (TDD 先行, 先跑红)
  - 在 `tests/unit/agent-asset-runtime.test.ts` 新增 GH-140 用例: (a) stale+有快照 → ensureReady 立即返回旧 snapshot 且**不**等 scan, 同时后台触发了 refresh (scanner.scanAll 被调); (b) scanning+有快照 → 立即返回; (c) idle/initial → 仍 await 首扫; (d) refresh:true → 仍 await 最新; (e) 派生方法 getDashboardInsights/getUsageSummary/listSessions 在 stale 时基于旧 assets 立即返回
  - tests: 新增用例先跑红 (实现未改前应失败于 stale 立即返回断言)
  - verify: 不适用 (纯逻辑); 用例命名含 GH-140
- [ ] 任务 2: 改 ensureReady 实现落 SWR 决策表
  - `runtime.ts`: stale+`id!=='initial'` → 立即 `return this.snapshot` + `void this.refresh({reason, wait:false})`; scanning+`id!=='initial'` → 立即 `return this.snapshot`; 其余分支 (idle/initial/error/refresh:true) 维持原 await 语义
  - tests: 任务1 用例转绿; **全套** `agent-asset-runtime.test.ts` 通过 (回归 908/936/952 等既有契约)
  - verify: 不适用
- [ ] 任务 3: 全门禁 + 真跑冷启动验收
  - tests: `pnpm typecheck` + `pnpm lint` + `pnpm test` 全绿
  - verify: CDP 真跑 (memory runtime-behavior-needs-real-run) — 持久 DB 存在时冷启动录屏, 断言 dashboard 数据在扫描完成前已可见 (首屏 <1.5s), stale→fresh 刷新不整屏闪烁; 与改前基线对比 (改前: 等扫描完成才显示内容)。截图/录屏请用户确认首屏体感 (主观 taste 项最终裁判是用户, 不变量 22)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

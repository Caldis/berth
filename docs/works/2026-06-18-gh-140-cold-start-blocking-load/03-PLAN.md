# 任务清单 (Design 产物 / 活清单)

范围 A。核心是 engine 单方法 (`runtime.ts` `ensureReady`) 语义修复 + 测试, **顺序执行** (状态机方法, 测试与实现强耦合, 不并行)。

- [x] 任务 1: 为 ensureReady SWR 行为写单测 (TDD 先行, 先跑红)
  - `tests/unit/agent-asset-runtime.test.ts` 新增 5 个 GH-140 用例 + helper (pendingScanner / staleRuntime): stale+有快照立即返回+后台 refresh; listSessions stale 立即返回; scanning+有快照不再阻塞; idle/initial 仍 await 首扫; refresh:true 仍 await
  - tests: ✓ 先跑红确认 3 个"立即返回"用例 timeout (旧实现 await 阻塞), idle/refresh:true 用例改前已绿
  - verify: 不适用 (纯逻辑); 用例命名含 GH-140
- [x] 任务 2: 改 ensureReady 实现落 SWR 决策表
  - `runtime.ts`: `id!=='initial'` → 立即 return (stale 额外 `void refresh(wait:false)`); `id==='initial'` (真无数据) → `await refresh(wait:true)`; `refresh:true` → await。决策表见 02-SPEC
  - tests: ✓ 45/45 agent-asset-runtime 全绿 (含回归 cold-start 908 / persist 936 / health 952); 全量 1237/1237 绿
  - verify: 不适用
- [x] 任务 3a: 全门禁 (implement 末)
  - tests: ✓ `pnpm typecheck` + `eslint`(改动文件) + `pnpm test` (175 文件 / 1237 用例) 全绿
  - verify: 不适用
- [x] 任务 3b: 真跑冷启动验收 (verify 阶段) — 通过
  - tests: not needed - 时序/可观测正确性, 走 verify 真跑
  - verify: ✓ CDP 真跑 agent 实例 (植入 checkpoint 完整快照模拟有持久快照的冷启动)。结果 statusBefore=stale → statusAfter=scanning (后台全量 scan 进行中), insights.dashboard **21ms** 立即返回旧数据 (hasData=true), sessions.list 11ms 返回 968 条; 对比改前/idle 路径 insightsMs=**28777** (28.8s 阻塞)。截图确认首屏完整渲染 dashboard 数据 (19.49B tokens / 活动热力图 / INSIGHTS / MOST USED), 非 loading 骨架, 侧栏扫描指示后台亮。根因B (首扫实测 36.3s) 未动, 已转后台不阻塞首屏。
  - 验证陷阱见 friction 20260619-4.0-verify-dev-agent-stop-no-wal-checkpoint

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

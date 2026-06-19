# 任务清单 (Design 产物 / 活清单) — GH-144

从 02-SPEC 拆解。顺序执行 (每个 lib 提取 + 改页面 + 直测 + 验证行为不变), 不同 lib/页面但顺序稳。
每项有测试证据或明确例外。纯提取**行为不变**, 现有组件测试是回归铁证。

- [ ] 任务 1: `lib/session-signals.ts` 提取 + session-detail 改用
  - 范围: 迁 `buildSessionSignals` + `countSignalHighlights` + `getToolDurationMs` (+ SessionSignals 类型) 到新 lib export; session-detail.tsx 删内联改 import (调用点不变)。
  - tests: `tests/renderer/session-signals.test.ts` (新) — buildSessionSignals 空 timeline→null / 失败计数 / avgToolDurationMs / slowestTool / tokenRate·cacheReadShare 边界; countSignalHighlights 阈值; getToolDurationMs durationMs 优先 + startedAt/endedAt fallback。
  - verify: 不适用 UI。新直测绿 + 现有 session-detail 组件测试不破 (行为不变, AC1/AC4)。
- [ ] 任务 2: `lib/status-line-models.ts` 提取 + capabilities 改用
  - 范围: 迁 `buildStatusLineViewModels` + `getStatusLineDiagnostics` + `getWorstDiagnosticLevel` + `getStatusLineGroupKey` + `rankStatusLineAsset` + `commandLooksLikeScriptReference` (+ 相关类型) 到新 lib; capabilities.tsx 删内联改 import; 复用已 export 的 redactStatusLineCommand。
  - tests: `tests/renderer/status-line-models.test.ts` (新) — buildStatusLineViewModels scope 优先级排序 (enterprise>project>user>session) + 覆盖检测; getStatusLineDiagnostics 各分支 (overridden/hidden/disabled/missingCommand/unresolvedEntry); getWorstDiagnosticLevel 枚举 (blocked>warning>ok)。
  - verify: 不适用 UI。新直测绿 + 现有 status-line-section.test.tsx 8 cases 不破 (行为不变, AC2/AC4)。
- [ ] 任务 3: `lib/runtime-state.ts` shouldShowScanningState + 去重
  - 范围: 新增 `shouldShowScanningState(scanning, runtimeState, assetCount)` (抽 capabilities:978 / instructions 重复); 两页改用。
  - tests: `tests/renderer/runtime-state.test.ts` (新) — scanning=true→true / idle+empty→true / has-assets→false 组合 (AC3)。
  - verify: 不适用 UI。直测绿 + 两页空态渲染不破。
- [ ] 任务 4 (收尾, 非实现): 记后续 issue
  - formatters 提取 (session-detail 格式器群 6 + 日期 3, D1) + asStringArray 统一 (宽松→严格行为变更, D2)。原 god-pages issue 收敛说明记剩余 (首版聚焦核心聚合器)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

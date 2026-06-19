# 技术方案 (Design 产物) — GH-144 god-pages 纯逻辑下沉

每条回指 01-ANALYSIS 验收标准 (AC1-5)。

## 决策汇总 (01-ANALYSIS 未决)
- **D1 formatters 列后续**: session-detail 格式器群 (formatDurationMs 等 6) + 日期 (3) 与核心聚合器无依赖, 量大纯字符串价值中, 独立小批后续。
- **D2 asStringArray 统一列后续**: 页面宽松版 → lib 严格版是**行为变更** (排除空白串), 需回归确认, 非纯提取, 独立处理。
- **D3 保留内联**: i18n formatters / sessionTabMeta / pluginComponentLabel (i18n 依赖 + 单页用)。

## 数据契约 / 模块结构
新建 3 个 renderer lib (纯函数 export, 签名与现内联**完全一致, 行为不变**):
- `lib/session-signals.ts`: `buildSessionSignals(detail)` + `countSignalHighlights(signals)` + `getToolDurationMs(event)` (从 session-detail.tsx 迁; SessionSignals 类型一并迁/export)。
- `lib/status-line-models.ts`: `buildStatusLineViewModels(assets)` + `getStatusLineDiagnostics` + `getWorstDiagnosticLevel` + `getStatusLineGroupKey` + `rankStatusLineAsset` + `commandLooksLikeScriptReference` (从 capabilities.tsx 迁; 复用已 export 的 `redactStatusLineCommand`; 相关类型一并迁)。
- `lib/runtime-state.ts`: `shouldShowScanningState(scanning, runtimeState, assetCount): boolean` (抽 capabilities:978 / instructions 重复判定)。

消费页 (删内联定义, 改 import, 调用点不变):
- session-detail.tsx → import session-signals。
- capabilities.tsx → import status-line-models + runtime-state。
- instructions.tsx → import runtime-state。

> 注意: 提取纯函数若依赖内联类型 (SessionSignals / StatusLineViewModel / StatusLineDiagnostic[Level] 等), 类型一并迁 lib 或确认已在 @shared; 调用点签名零变更。

## 界面质量与交互验收
不适用直接界面改动 — 纯逻辑提取, 调用点不变, 渲染输出相同。验收: 现有组件测试 (`status-line-section.test.tsx` 8 cases + session-detail 组件测试) 不破 = 行为不变铁证; 无新视觉验收 (不变量 22 — 无界面变更)。

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 例外 |
|---|---|---|---|---|
| buildSessionSignals (空/失败计数/avgDuration/slowestTool/token·cache 率) + countSignalHighlights + getToolDurationMs | unit | `tests/renderer/session-signals.test.ts` (新) | `pnpm test` | - |
| buildStatusLineViewModels (scope 优先级) + getStatusLineDiagnostics (各分支) + getWorstDiagnosticLevel (枚举) + group/rank/scriptRef | unit | `tests/renderer/status-line-models.test.ts` (新) | `pnpm test` | - |
| shouldShowScanningState (scanning / idle+empty / has-assets 组合) | unit | `tests/renderer/runtime-state.test.ts` (新) | `pnpm test` | - |
| 提取后两页行为不变 | renderer | 现有 `status-line-section.test.tsx` + session-detail 组件测试 | `pnpm test` | 纯提取行为不变, 现有组件测试即回归铁证 |

## 验收标准映射
| SPEC 项 | AC |
|---|---|
| session-signals.ts + 直测 | AC1 |
| status-line-models.ts + 直测 | AC2 |
| runtime-state.ts shouldShowScanningState | AC3 |
| 现有组件测试不破 | AC4 |
| 全量 typecheck/lint/test | AC5 |

## 任务分类与 debt
- type maintenance / subtype testability; source docs-issues。
- debt.estimate: incurred 1 / repaid 3 / net -2 (maintenance 降 debt)。
- debt.final 预期: net ≈ -2 (纯提取行为不变 + 核心聚合零测→直测)。
- Project 字段: 随 archive done 同步。

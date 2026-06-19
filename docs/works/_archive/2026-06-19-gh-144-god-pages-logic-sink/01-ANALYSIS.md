# 需求分析 (Explore 产物) — GH-144 god-pages 纯逻辑下沉

## 现状理解 (Explore agent 当前代码盘点)

两个 god-page 内联 27 个无 React 依赖纯函数, **核心聚合器零直测** (仅经组件间接覆盖, 重构易破):

**session-detail.tsx (1311 行)** 核心纯函数:
- `buildSessionSignals(detail): SessionSignals` (`:1129`) — 工具统计/失败率/时长/token率/cache 比例聚合, **零直测**。
- `countSignalHighlights(signals): number` (`:575`) — Tab 计数。
- `getToolDurationMs(event): number|null` (`:1177`) — 时长推导。
- 格式器群 (`:1189-1227` formatDurationMs/formatRate/formatFormulaMinutes/formatTooltipTimestamp/formatOptionalPercentage) + 日期 (`:817-832`) + i18n 标签 (`:788-804`)。

**capabilities.tsx (1054 行)** 核心纯函数:
- `buildStatusLineViewModels(assets): StatusLineViewModel[]` (`:378`) — statusline 优先级排序 + 诊断聚合, **零直测**。
- `getStatusLineDiagnostics` (`:426`) / `getWorstDiagnosticLevel` (`:461`) / `getStatusLineGroupKey` (`:368`) / `rankStatusLineAsset` (`:374`) / `commandLooksLikeScriptReference` (`:421`) — statusline 配套, 零直测。
- `redactStatusLineCommand` (`:405`) — **已 export + 已直测** (`tests/renderer/status-line-redaction.test.tsx` 5 cases, GH-115)。
- `asStringArray` (`:333`) — ⚠️ 与 `lib/capability-assets.ts:49` 同名但**实现有差异** (页面宽松版允许空白串 / lib 严格版排除)。

## 关联与依赖
- `lib/session-signals.ts` / `lib/status-line.ts` **不存在** — 纯逻辑全内联。
- 现有测试: `status-line-redaction.test.tsx` (redact 直测) + `status-line-section.test.tsx` (组件集成 8 cases)。`buildSessionSignals`/`buildStatusLineViewModels`/`getStatusLineDiagnostics`/`getWorstDiagnosticLevel` **核心聚合零直测**, 脆弱。
- `filterAssetsByAppScope` 已从 `@shared/scope` 导入 (非重复)。
- `scanning||(runtimeState==='idle'&&assets.length===0)` 空态判定: `capabilities.tsx:978` + `instructions.tsx` 逐字重复。

## Blast radius (符号边界)
renderer 包内, 纯函数提取**行为不变**。改动:
- 新建 `lib/session-signals.ts` + `lib/status-line-models.ts` + `lib/runtime-state.ts`。
- `session-detail.tsx` / `capabilities.tsx`: 删内联定义, 改 import (调用点不变)。
- `instructions.tsx`: 空态判定改用 shouldShowScanningState。
- 新增 3 个直测文件; 现有组件测试 (status-line-section 等) 保证提取后渲染不变。

## 任务分类与 debt 校准
- type maintenance / subtype testability
- source.kind docs-issues / refs: 2026-06-10-IMPROVEMENT-renderer-god-pages-logic-sink.md
- debt.estimate: incurred 1 / repaid 3 / net -2 (maintenance 降 debt)。explore 后维持 (聚焦核心聚合器 + 重复消除; formatters/asStringArray 列后续); confidence low→medium。

## 验收标准 (编号)
1. **buildSessionSignals 提取 + 直测**: 迁 `lib/session-signals.ts`, 新增直测 (空 timeline → null 字段 / 失败计数 / avgToolDuration / slowestTool / token·cache 率边界)。
2. **statusline 模型提取 + 直测**: buildStatusLineViewModels + getStatusLineDiagnostics + getWorstDiagnosticLevel + 配套迁 `lib/status-line-models.ts`, 新增直测 (scope 优先级排序 / 各诊断分支 / 最坏级别枚举)。
3. **空态判定去重**: `shouldShowScanningState(scanning, runtimeState, assetCount)` 迁 `lib/runtime-state.ts`, capabilities + instructions 改用, 新增直测。
4. **行为不变**: 提取后两页渲染与现有组件测试一致 (status-line-section 8 + 现有 session-detail 测试不破); 调用点逻辑等价。
5. 全量测试 + typecheck + lint 绿。

## 界面质量与交互验收
纯逻辑提取, **无 UI 改动** (调用点不变, 渲染输出相同)。验收: 现有组件测试 (status-line-section/session-detail) 不破 = 行为不变, 不需新视觉验收 (不变量 22 — 无界面变更)。

## 未决问题 (design)
- **D1 formatters 范围**: session-detail 格式器群 (formatDurationMs 等 6 个) + 日期 (3 个) 是否纳入首版? 倾向**列后续** (量大纯字符串, 价值中, 与核心聚合器无依赖, 可独立小批)。
- **D2 asStringArray 统一**: 页面宽松版 → lib 严格版是**行为变更** (排除空白串), 需回归确认 capabilities 不依赖宽松。倾向**列后续/独立** (行为变更风险, 非纯提取)。
- **D3 i18n formatters / sessionTabMeta / pluginComponentLabel**: 带 i18n 依赖 + 单页用, T3 保留内联 (不提取)。

## 测试策略 (概要, 详见 02-SPEC)
- unit 直测: session-signals (buildSessionSignals + countSignalHighlights + getToolDurationMs); status-line-models (buildStatusLineViewModels + 诊断 3 函数 + group/rank/scriptRef); runtime-state (shouldShowScanningState)。
- 回归: 现有 status-line-section + session-detail 组件测试不破 (行为不变铁证)。

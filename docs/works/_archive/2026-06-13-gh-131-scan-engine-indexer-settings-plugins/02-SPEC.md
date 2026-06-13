# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
新增扫描引擎信息契约, 放在 `packages/berth-scan-engine/src/shared/types/ipc.ts` 或相邻 shared type, 由 main IPC、preload、renderer、tests 共用。

核心类型:

```ts
export interface ScanEngineInfo {
  engine: {
    name: string
    version: string
    packageName: string
  }
  status: AssetRuntimeStatus
  snapshot: {
    id: string
    indexedAssets: number
    indexedFiles: number
    errors: number
    sources: number
  }
  controls: ScanEngineControlDescriptor[]
  capabilities: {
    workerMode: "one-shot" | "long-lived"
    schedulerMode: "single-flight" | "priority-queue"
    scopeMode: "filter-first" | "scan-on-miss"
    cacheMode: "sqlite-swr"
    incrementalFileChanges: boolean
    pauseSupported: boolean
    cancelSupported: boolean
    writableSettingsSupported: boolean
  }
  limits: ScanEngineLimitDescriptor[]
}
```

`indexedFiles` 先按 snapshot 中可追踪的 source path / source key 去重计算, 文案写成“indexed source files”。这比递归统计磁盘文件更真实, 也不会把未解析文件误报成已索引。后续 row-level delta 完成后可把统计口径扩展到 scan source coverage。

`controls` 先暴露当前真实参数:
- manual refresh: writable, 已有 `assets:refresh`。
- watcher debounce: read-only, 当前常量 `WATCHER_REFRESH_DEBOUNCE_MS = 1000`。
- watcher min interval: read-only, 当前常量 `WATCHER_REFRESH_MIN_INTERVAL_MS = 30000`。
- worker mode: read-only, 当前 `one-shot`。
- scheduler mode: read-only, 当前 `single-flight`。
- scope fallback: read-only, 当前缺 snapshot 时 `scan-on-miss`。
- pause / cancel / persisted scan strategy: disabled, 标注 engine 尚未支持。

新增 IPC:
- `assets:engine-info`: main 从 `AgentAssetRuntime` 读取版本、status、snapshot、control/capability 描述。
- 后续 `assets:update-engine-settings`, `assets:pause`, `assets:resume`, `assets:cancel` 只在对应 engine 能力实现时加入, 不提前暴露空接口。

Adapter API 设计目标:
- 新增稳定 public contract, 例如 `@berth/scan-engine/adapter-api` 或 package 根导出 `AgentAdapterDefinition`。
- Adapter 声明 `id`, `displayName`, `version`, `homepage`, `downloadUrl`, `releaseChannel`, `sourceDeclarations`, `homeResolvers`, `versionProbe`, `sensitivityPolicy`, `sessionPolicy`, `watchSupport`。
- `sourceDeclarations` 描述“去哪扫、扫什么、怎么限额、是否敏感”, engine 只消费声明和扫描结果, 不直接 import 第三方 adapter parser。
- 内置 Claude Code / Codex 也走同一 contract, 保留现有行为。
- Manifest plugin 只保留当前接口需要的方法, 移除旧 `scanAssets/watchAssets/resolveRelations` 残留。

## 任务分类与 debt
- type: feature。
- source.kind / refs: user-request, 关联 `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md` 与 GH-131。
- debt.estimate: 维持 incurred 8 / repaid 6 / net 2 / global / high / low confidence。`pnpm harness:stats` 当前 total=10, status=ok, 不需要 override。
- debt.final 预期: 若本任务完成 Settings 可见性、scope 不同步重扫、adapter API 收敛和外部 adapter source declaration, final 可降到 incurred 5 / repaid 8 / net -3。若只完成第一批 Settings 可见性, verify 时按实际完成度回写。
- revisions: design 阶段不修正 estimate。
- Project 字段同步: 已 tracked, Project #6 item `PVTI_lAHOADXbEs4BZHvQzgvmrG8`, In Progress。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

1. Engine info and runtime metrics
   - `runtime.ts`: 增加 `getEngineInfo()` 或纯函数 `createScanEngineInfo(snapshot, status)`。
   - `runtime.ts`: 导出 watcher debounce/min interval 常量或集中到 `engine/assets/settings.ts`, 避免 UI 硬编码。
   - `ipc.ts`: 增加类型与 channel。
   - `handlers.ts` / `preload/index.ts` / `tests/setup.ts`: 增加同名 API。

2. Renderer Settings
   - 新建 `scan-engine-settings-section.tsx`, 放在 Scanning 区顶部, 高于 File Watching 和 Agent Capability Plugins。
   - 新建或复用 hook: `useScanEngineInfo()` 从 IPC 拉取 info, 并在 `assets:progress` / `assets:changed` 后刷新。
   - UI 分组:
     - Summary: 状态、版本、索引资产、索引文件、错误数。
     - Runtime: started/completed/stale/progress。
     - Controls: manual refresh + 当前参数。
     - Capabilities/Limits: 当前支持与暂不支持项。
   - 不新增嵌套卡片; 使用现有 settings section 与 compact row 样式。

3. Scheduler / background indexer
   - `ScanCoordinator` 从 single in-flight guard 逐步演进为调度器: queue item, priority, reason, coalescing, pause/resume/cancel state。
   - 保持第一批 API 与旧行为兼容, 先让状态可观测。
   - 长驻 worker 在 scheduler 状态稳定后单独做, 避免同时改 IPC、UI、worker lifecycle。

4. Project scope
   - `project-scope-runtime.ts` 改为优先使用已有 global snapshot 过滤。
   - 缺缓存时返回 stale/partial 状态并后台排队 refresh, 只在确无可用数据时显示 loading。
   - 保留手动 refresh 能力。

5. Adapter API and plugins
   - 新建 adapter declaration 层, 将 `agent-capabilities.ts` 变成 declaration 聚合器。
   - Claude/Codex source declarations 先迁移, 再新增 Gemini/Copilot/Cursor/OpenCode/OpenClaw/Hermes declaration。
   - 每个 agent 的 parser / home resolver / fixtures 放在独立目录, 不让 engine 通用文件直接 import parser。
   - 网站插件页等 API 稳定后补。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | Scanning 区顶部新增扫描引擎 section, 先显示摘要, 细节用分组 rows 展示。避免把所有参数堆成长段说明。 | renderer test 检查核心字段; 本地运行后截图检查设置面板没有溢出。 |
| 组件选择 / 设计系统一致性 | 使用现有 Button/Switch/Badge/compact row 样式和 lucide icon。不要引入新 UI kit。 | 代码审查 + renderer test。 |
| 交互反馈 / 状态切换 | Manual refresh 调现有 `assets.refresh`; scanning/progress/stale/error 由 `assets:progress` / `assets:changed` 触发刷新。 | renderer test mock progress/change; 后续 Electron 实测。 |
| loading / empty / error / disabled / focus | 初次加载显示轻量 loading; IPC 失败显示错误但不清空已有信息; 不支持的控制项 disabled 且有原因; refresh button 可 focus。 | renderer test 覆盖 loading/error/disabled; 键盘 focus 通过组件结构检查。 |
| 响应式 / 可访问性 / 键盘可达 | Settings modal 内使用可换行 grid/flex, 长路径和数字不撑宽。按钮有文本和 aria 状态。 | renderer test + 截图人工检查。 |
| 文案 / i18n / 数字和路径格式 | `en.json` / `zh.json` 同步新增 key; 文件数和资产数使用本地格式; 时间用现有日期格式函数或简洁 ISO/local string。 | i18n key test 或 renderer test 覆盖中英文 key 是否渲染。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| `ScanEngineInfo` 统计版本、状态、索引资产/文件、控制面 | unit | `tests/unit/agent-asset-runtime.test.ts` 或新 `tests/unit/scan-engine-info.test.ts` | `pnpm vitest run tests/unit/agent-asset-runtime.test.ts` |  |
| IPC/preload/mock/channel 一致 | unit | `tests/unit/ipc-contract.test.ts`, `tests/setup.ts` | `pnpm vitest run tests/unit/ipc-contract.test.ts` |  |
| Settings 扫描引擎 section 显示 summary/control/disabled states | renderer | `tests/renderer/settings-page.test.tsx` | `pnpm vitest run tests/renderer/settings-page.test.tsx` |  |
| progress/change 后 Settings 刷新 engine info | renderer | `tests/renderer/settings-page.test.tsx` | 同上 |  |
| project scope 不在已有 snapshot 时同步 full refresh | unit | `tests/unit/project-scope-runtime.test.ts` | `pnpm vitest run tests/unit/project-scope-runtime.test.ts` |  |
| scheduler queue/pause/resume/cancel 状态 | unit | `tests/unit/scan-coordinator.test.ts` | `pnpm vitest run tests/unit/scan-coordinator.test.ts` |  |
| watch-wiring 增量路径不回退 | unit | `tests/unit/watch-wiring.test.ts` | `pnpm vitest run tests/unit/watch-wiring.test.ts` |  |
| adapter API declaration 与 built-in adapter 迁移 | unit | 新增 adapter declaration tests | `pnpm vitest run tests/unit/*adapter*.test.ts` |  |
| Gemini/Copilot/Cursor/OpenCode/OpenClaw/Hermes source declaration | unit | fixtures + source declaration tests | `pnpm vitest run tests/unit/agent-source-declarations.test.ts` |  |
| website plugin pages build | build/test | website 相关测试, 需先查项目结构 | 待实现时确定 |  |
| 全局类型与 harness | typecheck/harness | 无 | `pnpm typecheck:node`, `pnpm typecheck:web`, `pnpm harness:check` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| ScanEngineInfo + `assets:engine-info` | AC1, AC2, AC3, AC11, AC12 |
| Settings scan engine section | AC1, AC2, AC3, AC5, AC11, AC12 |
| Scheduler/background indexer | AC4, AC5, AC11, AC12 |
| Project scope filter-first | AC4, AC11, AC12 |
| Adapter public API | AC6, AC7, AC8, AC10, AC11 |
| External agent source declarations | AC6, AC8, AC10, AC11, AC12 |
| Website/plugin pages | AC8, AC9 |

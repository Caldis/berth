# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

本方案新增中心资产运行时, 不让页面、IPC handler 或各 adapter 分散维护扫描状态。

核心类型放在 `src/shared/types/ipc.ts` 或相邻共享类型:

```ts
export type AssetRuntimeState = 'idle' | 'scanning' | 'ready' | 'stale' | 'error'

export type AssetScanReason =
  | 'startup'
  | 'manual'
  | 'watcher'
  | 'project-scope'
  | 'legacy-scan-all'

export interface AssetScanProgress {
  phase: 'discovering' | 'parsing' | 'indexing' | 'deriving'
  current: number
  total: number
  label?: string
}

export interface AssetRuntimeStatus {
  state: AssetRuntimeState
  reason?: AssetScanReason
  projectDir?: string
  startedAt?: string
  lastCompletedAt?: string
  stale: boolean
  progress?: AssetScanProgress
  error?: string
}

export interface AssetSnapshot {
  id: string
  projectDir?: string
  assets: Asset[]
  stats: AssetStats
  errors: ScanError[]
  sources: AgentScanSourceGroup[]
  projectCandidates: ProjectScopeCandidate[]
  status: AssetRuntimeStatus
}
```

IPC 契约:
- `assets:snapshot`: 立即返回当前 `AssetSnapshot`; 没有完成扫描时返回空 assets + `state=scanning|idle`, 不等待大文件扫描。
- `assets:refresh`: 启动中心运行时扫描, 返回当前 `AssetRuntimeStatus`; 可选 `wait?: boolean` 给旧调用兼容。
- `assets:status`: 立即返回 `AssetRuntimeStatus`。
- `assets:scan-all`: 保留兼容, 内部调用中心运行时 `refresh({ wait: true, reason: 'legacy-scan-all' })`。
- `assets:runtime-status` event: main 推送状态变化。
- `assets:snapshot-updated` event: main 推送 snapshot id 与 summary; renderer 随后请求 snapshot 或使用随事件携带的轻量数据。

派生数据不再由 handler 自己维护:
- `sessions:list` 调用中心运行时 `listSessions(opts)`。
- `usage:summary` 调用中心运行时 `getUsageSummary(opts)`。
- `assets:health-check` 调用中心运行时 `getHealthChecks(opts)`。
- `assets:search` 调用中心运行时 `search(query)`。
- `project-scope:candidates` 读取中心 snapshot 的 candidates。

## 任务分类与 debt
- type / maintenance.subtype: `maintenance / performance`。
- source.kind / refs: `user-request`, 来源为用户对底层架构和 UI loading 的追加要求。
- debt.estimate: design 后校准为 `incurred=4, repaid=9, net=-5, scope=global, risk=high, areas=[performance, architecture, testability, ui-ux], confidence=medium`。原因是方案影响 main/preload/renderer、IPC、project scope、search、usage、health、sessions 等全链路。
- debt.final 预期: 完成后性能 debt 显著降低, 剩余 debt 主要是首次进程生命周期内仍需读取本地大文件; 受 v0.1 只读边界限制, 本轮不写持久化索引。
- revisions: INDEX 已追加 design 校准记录。
- Project 字段同步: design 结束后运行 `node scripts/harness-projects.mjs ensure docs/works/2026-06-03-gh-86-app-performance-analysis`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

主进程中心模块:

```text
src/main/engine/assets/
  runtime.ts          # 中心入口: snapshot/status/job/selectors
  worker-host.ts      # worker thread 生命周期、消息、错误、进度
  worker.ts           # worker entry: 文件枚举、adapter scan、JSONL parse
  cache.ts            # 进程内 file fingerprint -> parsed asset cache
  selectors.ts        # sessions/usage/health/search/project candidates
  types.ts            # main 内部 job/result/cache 类型
```

现有模块迁移原则:
- `src/main/engine/scanner.ts` 保留为兼容 facade, 内部委托 `AgentAssetRuntime`。
- `src/main/project-scope-runtime.ts` 不再直接 `initScanner().scanAll()`; 改为设置 runtime projectDir 并触发 `project-scope` refresh。
- `src/main/engine/search.ts`, `usage.ts`, `health.ts`, `relations.ts` 保持纯函数或轻状态工具, 由 `AgentAssetRuntime` 统一调用和缓存结果。
- Claude/Codex adapter 只描述扫描来源和解析逻辑; 文件指纹缓存、任务调度、进度、错误聚合由中心模块统一处理。
- Worker 内可复用 adapter parser, 但 worker 输出只含结构化 assets/errors/sources/progress, 不触碰 BrowserWindow 或 IPC。

Worker 策略:
- CPU-heavy JSONL parse 放在 `worker_threads`。Node 官方说明 worker threads 适合 CPU-intensive JavaScript; 文件 I/O 使用 async fs API 更合适。来源: https://nodejs.org/api/worker_threads.html, https://nodejs.org/api/fs.html
- worker 输入: `projectDir`, agent homes, managed dir, env 中与 agent home 相关的白名单字段, 旧 snapshot 的 file fingerprints。
- worker 输出: `ScanResult`, `AgentScanSourceGroup[]`, file fingerprints, changed/removed asset ids, scan timings。
- main thread 只维护 job id、状态、in-flight 去重、snapshot 原子替换和事件推送。

缓存策略:
- 本轮只使用进程内缓存, 不写磁盘索引, 遵守 `docs/ARCHITECTURE.md` 的只读边界。
- fingerprint 使用 path + size + mtimeMs。命中时复用已解析 session meta asset。
- watcher 事件只标记受影响路径 stale, 中心运行时合并短时间内的变更并触发局部 refresh。
- 搜索 index 按 snapshot id 和 asset signature 复用; snapshot 未变时不重复 build。

Renderer 状态边界:
- `useAppStore` 增加 `assetRuntimeStatus`, `assetSnapshotId`, `assetErrors`, `lastAssetRefreshAt`。
- 新 hook `useAssetRuntime()` 负责订阅 runtime status/snapshot 事件和启动 startup refresh。
- `useSessions`, `useUsageSummary`, `useHealthChecks`, `useScanSources` 只消费中心 snapshot 或中心 IPC selector, 不自行维护扫描流程。
- 页面组件只接收 view model: `{ data, loading, stale, error }`, 不知道 scanAll、worker 或 adapter。

## Plugin-runtime 集成追加方案

用户追加优化项 1-4 后, plugin 机制从“只描述 runtime 结果”扩展为“可参与 runtime adapter 构造的只读声明源”。

数据契约:
- `AgentCapabilityPluginManifestEntry` 保留 `sourceDescriptors`, `assetDescriptors`, `healthCheckDescriptors`, `hookSchema`, `references` 的解析结果。
- `AgentCapabilityPluginId` 与 `AgentPluginAgentId` 从内置 union 扩展为 string, built-in id 仍由 registry 保证。
- manifest cache 使用 `path + size + mtimeMs` 指纹, 命中时复用已验证 entry; 文件变化、缺失或 JSON parse 错误重新计算。

主进程模块:
- `src/main/agent-plugins/descriptors.ts`: built-in source/asset/hook/health descriptor 单一声明源, registry 和 adapter source coverage 共用。
- `src/main/agent-plugins/adapter-registry.ts`: worker 内构造 adapter 列表, 默认注册 Claude/Codex built-in adapter; 有效 read-only manifest 注册 `ManifestAgentAdapter`。
- `ManifestAgentAdapter`: 只读取 manifest descriptor 和 manifest 文件本身, 产出 `plugin` asset 与 source coverage; 不 import 或执行第三方 `implementation.entrypoint`。
- `AssetScanner` 通过 adapter registry 构造 adapters, 不直接硬编码所有 adapter。

Registry:
- `agent-plugins:list` 仍由 `AgentAssetRuntime.ensureReady()` 提供 `snapshot.sources` 和 agent version。
- registry 把 built-in plugin 与 valid manifest plugin 合并返回; invalid/incompatible manifest 保留在 `manifests` 里供 Settings 展示。
- built-in capabilities 中 `sourceDiscovery`、`assetParsing` 从 runtime source coverage 读 detected 状态; 第三方 manifest plugin 的 coverage 来自 runtime 的 manifest adapter source group。

Renderer:
- `useAgentCapabilityPlugins()` 使用进程内 cache + in-flight 去重。
- 有缓存时立即返回旧数据并设置 `stale=true`; 后台刷新完成后替换。
- 依赖 `assetSnapshotId` 触发刷新, 避免 project scope 或 runtime refresh 后 Settings/Capabilities 插件描述停留旧状态。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持现有 sidebar + top navigation + 页面 panel; 不引入全屏遮罩。启动期间 shell、导航和已可用面板保持可操作。 | Electron e2e 断言 shell 可见且无全局遮罩。 |
| 组件选择 / 设计系统一致性 | 使用现有 Tailwind token、`EmptyState`, `NoticePanel`, Overview `SkeletonRows`, Usage skeleton 风格; loading 形态匹配各 panel 尺寸。 | renderer 测试检查 skeleton DOM 与既有 class 约定; 截图检查信息密度。 |
| 交互反馈 / 状态切换 | TopNavigation 或 sidebar footer 显示轻量扫描状态; 各 panel 独立显示 loading/stale/error。刷新时旧数据保留并标记 stale。 | renderer 测试: 有旧数据时 refresh 不清空列表; 状态文本可见。 |
| loading / empty / error / disabled / focus | Overview metrics、Recent sessions、Usage snapshot、Health worklist 分别显示骨架屏; project scope 切换时只禁用 scope 菜单当前操作, 不禁用整页。 | renderer + e2e: `role=status`, 按钮 disabled/focus 可断言。 |
| 响应式 / 可访问性 / 键盘可达 | loading 文本使用 i18n, 可由 screen reader 读取; skeleton 不抢 focus; keyboard 仍可操作导航与搜索。 | Testing Library role/label 断言; e2e 键盘导航。 |
| 文案 / i18n / 数字和路径格式 | 新增 `assetRuntime.*` en/zh 文案, 不显示内部 worker/job id; 只展示“正在扫描本地 Agent 数据”“显示上次结果”等用户可验证状态。 | renderer i18n 测试或页面测试覆盖 en/zh 关键文案。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 中心运行时 in-flight、snapshot、status、selector 缓存 | unit | `tests/unit/agent-asset-runtime.test.ts` | `pnpm test -- tests/unit/agent-asset-runtime.test.ts` |  |
| worker-host 消息、progress、error、退出处理 | unit | `tests/unit/asset-worker-host.test.ts` | `pnpm test -- tests/unit/asset-worker-host.test.ts` |  |
| file fingerprint 命中、失效、删除、parse error | unit | `tests/unit/asset-file-cache.test.ts` | `pnpm test -- tests/unit/asset-file-cache.test.ts` |  |
| scanner facade 兼容现有 `AssetScanner` API | unit | `tests/unit/engine-scanner.test.ts` | `pnpm test -- tests/unit/engine-scanner.test.ts` |  |
| project scope 使用中心运行时刷新 | unit | `tests/unit/project-scope-runtime.test.ts` | `pnpm test -- tests/unit/project-scope-runtime.test.ts` |  |
| search index snapshot 未变时不重复 build | unit | `tests/unit/search.test.ts` 或 `tests/unit/agent-asset-runtime.test.ts` | `pnpm test -- tests/unit/search.test.ts tests/unit/agent-asset-runtime.test.ts` |  |
| renderer store/runtime hook 状态流 | renderer | `tests/renderer/use-asset-runtime.test.tsx`, `tests/renderer/app-store.test.ts` | `pnpm test -- tests/renderer/use-asset-runtime.test.tsx tests/renderer/app-store.test.ts` |  |
| Overview 局部 skeleton/stale/error | renderer | `tests/renderer/overview-performance-loading.test.tsx` | `pnpm test -- tests/renderer/overview-performance-loading.test.tsx` |  |
| Sessions/Usage 页面切换不清空旧数据 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm test -- tests/renderer/sessions-pages.test.tsx` |  |
| Electron shell 不被全局 loading 阻断 | e2e | `tests/e2e/app.e2e.ts` | `pnpm test:e2e tests/e2e/app.e2e.ts` |  |
| 性能 benchmark 前后对比 | manual/e2e script | 临时脚本写系统临时目录 | `pnpm build`; Playwright Electron benchmark | 自动断言易受本机历史数据量影响, 记录数值证据即可。 |
| harness 任务态 | harness | 当前 work | `pnpm harness:check --work docs/works/2026-06-03-gh-86-app-performance-analysis` | 当前仓库全局 drift 会阻断正式命令; 同时运行脚本级局部 check。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 中心运行时 + worker-host | 1, 2, 4, 8 |
| 进程内 file fingerprint cache | 2, 3 |
| runtime selector cache: sessions/usage/health/search | 4, 5, 6 |
| IPC 迁移与 project scope refresh | 4, 5, 6, 8 |
| renderer runtime store + 局部 loading | 1, 4, 5 |
| benchmark 与 Electron e2e | 1, 7 |

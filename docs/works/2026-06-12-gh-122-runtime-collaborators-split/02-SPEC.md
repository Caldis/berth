# 技术方案 (Design 产物)

> 2026-06-12。基于 01-ANALYSIS。Q1→B 案 (coordinator 持 scanner 生命周期, 代际 guard 内化); Q2→缓存只存数据 (assetMap 由 runtime 命中时重建, 现行为零变更)。均无 PRD 歧义, 依事实自决。

## 数据契约

**公共 API 零变更** (AC-3): `AgentAssetRuntime` 全部公共方法签名不变; 三协作者为**内部协作者**, 消费面 (ipc/handlers、main/index、watch-wiring、project-scope-runtime) 零改动。`AssetSelectorCache` 接口零外部消费 (grep 实证), 随迁 selector-cache.ts 导出, runtime.ts 不再声明。

**三协作者契约** (均位于 `packages/berth-scan-engine/src/engine/assets/`):

```ts
// selector-cache.ts — 纯平移 (AC-1)
export interface AssetSelectorCache { select<T>(key, snapshot, derive): T; clear(): void }
export class SnapshotSelectorCache implements AssetSelectorCache { /* 82-97 行原样 */ }

// project-snapshot-cache.ts — 封装散布 5 处的裸 Map 操作 (AC-1)
export class ProjectSnapshotCache {
  has(projectDir?: string): boolean
  get(projectDir?: string): AssetSnapshot | undefined
  set(projectDir: string | undefined, snapshot: AssetSnapshot): void
  // projectKey (normalizeProjectPathKey 归一, '' = global) 内聚为私有 — 消灭调用方 projectKey() 习语
}

// scan-coordinator.ts — Q1=B (AC-1, 链 ③ 落点)
export interface ScanOutcome {
  scanResult: ScanResult
  sources: AgentScanSourceGroup[]
  projectCandidates: ProjectScopeCandidate[]
  projectDir: string | undefined
}
export interface ScanSink {
  onProgress(progress: AssetScanProgress): void
  onPartial(partial: AssetScanPartial): void
  onCompleted(outcome: ScanOutcome): void
  onFailed(error: unknown): void
}
export class ScanCoordinator {
  constructor(createScanner: (projectDir?: string) => AssetRuntimeScanner, projectDir?: string)
  swap(projectDir?: string): void        // 换代: 新 scanner; 在途扫描的一切后续回调被代际检查丢弃 (R4 内化)
  isScanning(): boolean                  // inFlight !== null
  wait(): Promise<void>                  // inFlight ?? resolved
  run(sink: ScanSink): Promise<void>     // 执行一轮扫描: 捕获当代 scanner, 每个回调派发前检查代际;
                                         // try/catch→onFailed, finally 清 inFlight; 已在扫则直接返回既有 inFlight
  current(): AssetRuntimeScanner         // 仅供 runtime 读 scanner 元数据 (getProjectDir 等) — 不暴露生命周期控制
}
```

**runtime 重组后的职责** (AC-2): 状态机转移 (idle/stale/scanning/ready/error) + ScanSink 实现 (数据提交: snapshot/assetMap/缓存写入/持久化/progress 推送) + 快照折叠 (applyPartial 逻辑并入 sink.onPartial 路径 + applyFileChange) + 领域查询门面 (search/health/usage/sessions) + 协作者编排。
- `refresh()` 重组: `if (coordinator.isScanning()) { wait? await coordinator.wait(); return status }` → `transitionToScanning(reason)` → `coordinator.run(this.makeSink(reason))` → wait 语义不变。
- `setProjectDir()` 重组: `coordinator.swap(projectDir)` 替代 `this.scanner = this.createScanner(...)` — R4 语义由代际检查承接 (旧扫描的 onCompleted/onFailed/onProgress/onPartial 全部被 coordinator 丢弃, 等价于现 isCurrent 拦截)。
- 持久化谓词 ×2 重复习语收敛为私有 `persistIfDefaultView()` (顺势, 同文件)。

**六行为不变量逐条承接** (AC-4, 锚点测试逐字不动):
1. 快照 ID 稳定 — onPartial/applyFileChange 不 mint id, 仅 onCompleted mint: 逻辑原样平移进 sink。
2. scope 无重扫 — setScopeSelection/setProjectDir 缓存路径不动。
3. R4 guard — coordinator 代际检查 = isCurrent 等价 (swap 即换代); 测试 "discards a mid-flight scan" 直接验证等价性。
4. P4.6 终态保序 — onCompleted/onFailed 内 runtime 推终态 progress, 顺序不变。
5. device-wide health — 查询门面不动。
6. 持久化只存默认视图 — persistIfDefaultView 谓词不变。

## 任务分类与 debt
- maintenance / architecture; source: docs-issues。
- debt.estimate: 2/5/-3, module/high/medium — design 后维持 (B 案消除写回边界不确定性后 risk 降级留 verify 实证后做)。
- debt.final 预期: 同量级, risk 预期降 low。
- Project 字段同步: 已绑定, archive 时 done。

## 模块结构 / 组件拆分

实施 4 步顺序 (同文件 runtime.ts 反复修改, 不并行); 每步全量门禁 + 提交:
- **T1** selector-cache.ts 出文件 (纯平移, 最小风险先行)
- **T2** project-snapshot-cache.ts (封装 5 处散布)
- **T3** scan-coordinator.ts (B 案重组 refresh/setProjectDir/runRefresh)
- **T4** 收口: runtime 行数核对 + 全量门禁 + e2e + dev 冷启动 + ARCHITECTURE engine 行补三协作者

## 界面质量与交互验收

不适用 (包内纯结构重构, 零 UI/IPC 改动)。

## 测试策略

锚点网: `agent-asset-runtime.test.ts` 24 用例**逐字不动**全绿是每步硬门禁 (AC-4)。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| T1 SelectorCache 平移 | unit (新直测 + 锚点) | tests/unit/selector-cache.test.ts (新, 3 断言: 同 id 命中/换 id 重derive/clear) + 锚点 24 | `pnpm test` | — |
| T2 ProjectSnapshotCache | unit (新直测 + 锚点) | tests/unit/project-snapshot-cache.test.ts (新: set/get/has、路径归一同键、undefined=global 键、miss) | `pnpm test` | — |
| T3 ScanCoordinator | unit (新直测 + 锚点) | tests/unit/scan-coordinator.test.ts (新: in-flight 去重/wait 语义/swap 换代后旧回调全丢/onFailed 路径/finally 清理) | `pnpm test` | — |
| 重组行为零变更 | unit 全量双轮 + e2e + dev 冷启动 | 全量 + tests/e2e | `pnpm test` ×2 + `pnpm build && pnpm test:e2e` + agent 实例探活 | 锚点 24 逐字不动是判据; e2e win32 已知项口径同 GH-119/121 |
| 包侧回归 | 包三连 | packages/berth-scan-engine | `--filter` typecheck/build/test | CLI golden 既有 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| T1+T2+T3 三文件落位 | AC-1 |
| runtime 重组 (sink/编排/行数) | AC-2 |
| 消费面 git diff 零改动 | AC-3 |
| 锚点 24 逐字不动 + 全量/e2e/包 | AC-4 |
| 三个新直测 | AC-5 |
| 每步门禁 + CI | AC-6 |

# 技术方案 (Design 产物) — GH-155 backgroundIndexQueue

每条回指 01-ANALYSIS 的验收标准编号 (A1..A12)。

## 裁决记录 (01-ANALYSIS 未决问题, 按推荐执行)

- **Q1 mid-scan clobber → 入批** (A9): 队列使全量扫描窗口 ×M, 不修等于本 feature 自己放大已知 bug; 修法收敛在 runtime 单文件。
- **Q2 watcher 盲区 → 不入批**: 全部 deep 项目进 watch 集 = 数百 chokidar 根不可控; 时效由队列 revalidation + 24h 周期扫兜底 (决策① 不承诺时限)。issue 追记暴露面变化。
- **Q3 队列一轮完成即静默**: 不持续重排队; 全量扫 commit 后做一轮静默 revalidation (见 §写路径 W4, 有 graft 就必须有 revalidation 兜过期)。
- **Q4 N/M 承载 = 扩 `AssetRuntimeStatus`**: 复用 `assets:progress` 通道, 不新增 IPC channel (无四方对账成本)。

## 数据契约

### C1. `AssetRuntimeStatus.backgroundIndex` (可选字段, A8)
```ts
// pkg:shared/types/ipc.ts — AssetRuntimeStatus 追加:
backgroundIndex?: {
  state: 'indexing' | 'revalidating' | 'done' | 'unsupported'
  indexedProjects: number   // N: 首轮已 deep 完成的项目根数 (含 active 项目, 天然已 deep)
  totalProjects: number     // M: 候选项目根总数 (resolveProjectConfigRoots 归一去重)
}
```
- 经既有 `progressListener → assets:progress → applyAssetProgress → store.assetRuntimeStatus` 流动, renderer 零新订阅通道。
- banner 显示条件: `scopeSelection.mode==='global' && state==='indexing' && totalProjects>0`; `revalidating`/`done` 不显示 (决策⑤ 完成后消失; revalidation 静默, 仅 hairline)。

### C2. per-project deep 资产 owner-tag (A1, A7)
- 新引擎函数产出的每个资产: `meta.scanDepth='deep'` + `meta.projectPath=<root>` + `meta.sourceKey` (parser 既有)。entity id 走既有 `assetEntityId` 确定式 — 同文件 shallow→deep 替换 id 不变。
- **tag 时机 = cache 取回之后** (post-cache re-tag copy): `AssetFileCache.getOrParse` 的缓存条目必须 depth-tag 中立, 否则 shallow/deep 互相污染 (shallow 先扫缓存 shallow-tag 行, deep 命中缓存拿回错误 tag)。`shallow-conventions.ts` 的 `ownerTag`/produce 内打 tag 同批改为 post-cache (行为不变, 单测钉住)。

### C3. helper 协议扩展 (A4)
```ts
// host→child: { type: 'scan-project-deep', data: { projectRoot, excludePaths?, respectGitignore? } }
// child→host: { type: 'project-deep-done', assets: Asset[], errors: ScanError[] } | 复用 { type:'error' }
```
- `AssetRuntimeScanner` (scan-coordinator.ts) 加可选 `scanProjectDeep?(projectRoot, opts): Promise<{assets; errors}>`; `HelperAssetScanner` 实现之; worker/CLI 不实现 → 队列 `state:'unsupported'` 静默禁用 (CLI one-shot 无队列需求, 生产 Electron 恒 helper)。
- **helper host 内部互斥**: 所有 child 请求 (scanAll / scan-project-deep) 走同一 promise-chain mutex 串行 — 现状并发 runScan 会交错 message (explore 实证), 加队列后互斥成为硬前提。

### C4. 队列 (新 `engine/assets/background-index-queue.ts`, A2, A4, A5)
```ts
class BackgroundIndexQueue {
  sync(candidates: ProjectScopeCandidate[], activeRootKey: string): void  // commit 后调用: 增量补新根, 完成集保留
  pump(): void        // 空闲驱动: 逐项目出队 → scanProjectDeep → 回调提交
  pause() / resume()  // 随 runtime.pause/resume 联动; 在途项目 drop 结果 + 位置保留
  preemptForForeground(): void  // refresh() 入口调用: kill 在途后台扫 + 重入队该项目
}
```
- **顺序 (A2, 决策④)**: 按 `candidate.lastSeenAt` 降序 (merge 默认 sessionCount 排序不用); root 归一 `resolveProjectConfigRoots(path)[0]` 去重; active root 直接计入 indexed。
- **门控 (A5)**: 每次出队前检查 ① `schedulerPaused` ② `coordinator.isScanning()` (前台让位, A4) ③ `idleOnly/acOnlyFullScan` 同 `runPeriodicScan` 语义 (同一 powerMonitor 注入)。任一不过 → `BACKGROUND_RETRY_MS`(60s, 可注入) 后重试。
- **背压 (A11)**: 项目间 sleep `settings.batchPauseMs` (复用既有背压参数, 不加新设置)。
- **重跑 (Q3)**: 首轮 `indexing` → 完成 `done`; 全量扫 commit 后 `sync` 把已完成项目重入队为 `revalidating` 轮 (graft 的过期兜底), 结束回 `done`。
- v1 不加新用户设置 (暂停/idle/AC/背压全部复用既有档位; "可控"由 pause 覆盖)。

### C5. 写路径 (核心, A1, A6, A7, A9)

**W1 队列提交** — 新 runtime 方法 `applyBackgroundProjectResult(rootKey, assets, errors)`, 复刻 `applyFileChange` 范式 (snapshot.id 稳定, 无 selectorCache 以外的 churn):
1. owned = 现 snapshot 中 `meta.projectPath` 归一 == rootKey 且带 `scanDepth` tag 的行 (session 等非 owner-tag 行绝不误删)。
2. `merged = mergeSharedConventions([...(assets ∖ owned 之外全体), ...新 assets])`; stats 重算; assetMap 重建; selectorCache 清; live snapshot + 当前 view 的 snapshotCache 条目更新。
3. **持久化**: 变更 sourceKey 集 = keys(owned) ∪ keys(new); 逐 key `store.replaceBySourceKey(key, newRowsOfKey, defaultEnvelope)` (key 消失 = 空数组删除)。envelope 恒取 **default view** 快照 (当前 view ≠ default 时同步折叠 default 的 snapshotCache 条目再作 envelope) — 不受 `persistFileChange` 的 default-view gate 限制, 后台成果必须落盘 (A6); 但 envelope 绝不能写入非 default view 的 projectDir/status (冷启 restore 语义)。
4. 经 `progressListener` 发 lean partial + 更新后的 status.backgroundIndex。

**W2 全量扫 graft (防回退闪变, A1 心智保护)**: `commitScan` 中, 对扫描结果里仅有 shallow 行、但上一 snapshot 已有 `scanDepth='deep'` 行的项目根: 丢弃 incoming 该根的 shallow 行, 保留上代 deep 行 (`foldKeepingShallow` 的镜像 `graftDeepRows`)。随后队列 `sync` 将这些根重入队 revalidation (W4) 兜 deep 行过期 (删除的文件短暂残留, 最终一致)。

**W3 mid-scan sourceKey 保留合并 (Q1 修复, A9)**: runtime 增 `midScanSourceKeys: Set<string>` — `coordinator.isScanning()` 期间 `applyFileChange` 记录 key; `applyPartial` 与 `commitScan` 对该集合内的 key **用当前 snapshot 行替换 incoming 行** (含"当前无行=删除赢"); commit/fail 时清集合。后台队列提交不经 applyPartial, 不受影响; 但队列提交也发生在前台扫描中时 (W1 与前台扫 partial 交错) — 队列提交的 rootKey 行同样记入 midScanSourceKeys, 统一由 W3 保护。
- 与既有语义边界: 保留合并只影响"扫描期间被增量更新过的 key", 其余行为 (foldKeepingShallow / latest-wins pending) 不动。

**W4 触发链**: `commitScan` 尾部 → `queue.sync(outcome.projectCandidates, activeRootKey)` + `queue.pump()`; `restorePersistedSnapshot` 后首次 `ensureReady→refresh→commit` 自然触发首轮 (main/index.ts 零改动)。`refresh()` 入口 → `queue.preemptForForeground()`。`pause()/resume()` → 队列联动。

### C6. renderer (A8, A10)
- 新 `components/shared/global-indexing-banner.tsx`: 自订阅 (store 原子 selector: `assetRuntimeStatus.backgroundIndex` + `scopeSelection.mode`), 条件外 return null; `NoticePanel` info tone; 挂 `app-layout.tsx` `{children}` 之上单行 — AppLayout 本体零新订阅 (保 GH-153 T8 布局壳不变量)。
- i18n: `locales/en.json` + `zh.json` 加 `nav.scanStatus.backgroundIndexing` (`"Indexed {{indexed}}/{{total}} projects — results are filling in"` / `"已索引 {{indexed}}/{{total}} 个项目, 结果逐步补全"`)。
- hairline: 现状已常驻 (app-layout), 不动 (01-ANALYSIS 确认)。

## 任务分类与 debt
- type: feature / subtype: 不适用; source.kind: docs-issues (refs 见 INDEX)
- debt.estimate: net=6 维持 (design 展开面: W2 graft + W3 保留合并 + C3 互斥 — 均为并发正确性必需, 无投机抽象; 单文件行数可控)
- debt.final 预期: net≈6, scope=cross-process, risk=high→medium (verify 后按测试覆盖回填)
- revisions: explore 已记 1 条; design 无估算变化不追加
- Project 字段同步: implement 首项完成后 `node scripts/harness-projects.mjs ensure`

## 模块结构 / 组件拆分 (分层合规)

| 层 | 文件 | 改动 |
|---|---|---|
| engine | `engine/project-deep-scan.ts` (新) | `scanProjectDeep(root, cache, opts)`: shallow 源全集 + 嵌套 `**/CLAUDE.md` (buildScanIgnore + loadNestedProjectIgnore, 对齐 claude-code/scanner.ts:141) + config-root 链 (resolveProjectConfigRoots 已含 root→leaf); post-cache re-tag `scanDepth:'deep'` |
| engine | `engine/shallow-conventions.ts` | ownerTag 移到 post-cache (行为等价重构, C2) |
| engine | `engine/assets/background-index-queue.ts` (新) | C4 队列 (纯逻辑, timer/scanner/powerMonitor 全注入, electron-free) |
| engine | `engine/assets/runtime.ts` | W1/W2/W3/W4 + backgroundIndex 状态维护 |
| engine | `engine/assets/scan-coordinator.ts` | `AssetRuntimeScanner.scanProjectDeep?` 接口字段 (仅类型) |
| shared | `shared/types/ipc.ts` | C1 status 扩字段 |
| main | `src/main/scan-helper.ts` + `helper-host.ts` | C3 协议 + 互斥 + `HelperAssetScanner.scanProjectDeep` |
| renderer | `components/shared/global-indexing-banner.tsx` (新) + `app-layout.tsx` (1 行) + `locales/{en,zh}.json` | C6 |
| 不碰 | worker.ts/worker-host.ts (不实现 deep, 接口可选) · components/dashboard · components/ui · pages/* · use-ipc.ts · 两个 health-i18n golden snap | 避撞清单 |

## 界面质量与交互验收 (A8, A10)

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | banner 文档流内、内容之上, 单行轻量 (NoticePanel info), 不 overlay 不推挤焦点 | CDP 截图 (global scope, 队列进行中) |
| 组件选择 / 一致性 | 复用 `NoticePanel` (既有 info tone), 不新造样式 | 代码走查 + 截图 |
| 交互反馈 / 状态切换 | indexing 显示 N/M 且 N 递增; done/revalidating/非 global scope 隐藏 | **CDP 时序采集**: N 递增序列 + 完成消失 (A8) |
| loading/empty/error | M=0 或 unsupported 不渲染; 队列失败项计 errors 不阻塞 banner (N 继续) | 单测 + CDP |
| 响应式 / 可访问性 | NoticePanel 既有语义 (role=status 或等价); 文本自适应宽度 | 走查 |
| 文案 / i18n | en/zh 双语插值; 无 raw key (queryByText 兜底断言) | renderer 测试 + CDP 截图双语可选 |

## 测试策略 (A12; 每实现项证据见 03-PLAN)

| 变更/行为 | 类型 | 测试文件 | 命令 |
|---|---|---|---|
| scanProjectDeep 深扫面 (嵌套 CLAUDE.md/skills/设置) + post-cache tag | unit (engine) | `packages/berth-scan-engine/tests/project-deep-scan.test.ts` (新) | `pnpm --filter @berth/scan-engine test` |
| shallow ownerTag post-cache 等价 | unit (engine) | 既有 shallow-conventions 相关测试补充 | 同上 |
| helper 协议 + 互斥串行 + scanProjectDeep | unit | `tests/unit/helper-host.test.ts` 扩展 | `pnpm test` |
| W3 mid-scan 保留合并 (增量不被 partial/commit 回吐; 删除赢) | unit | `tests/unit/agent-asset-runtime.test.ts` 扩展 | `pnpm test` |
| W1 队列提交折叠/持久化/envelope 语义 + W2 graft | unit | 同上 | `pnpm test` |
| C4 队列: 排序/门控/让位/preempt/pause/revalidation (fake timers + 注入) | unit | `tests/unit/background-index-queue.test.ts` (新) | `pnpm test` |
| C1 status 扩字段流动 | unit | ipc-contract/mock 结构性通过 (无新 channel); banner 测试覆盖消费 | `pnpm test` |
| banner 渲染条件/文案/raw-key | renderer | `tests/renderer/global-indexing-banner.test.tsx` (新) | `pnpm test` |
| 渐进补全端到端: 非活动项目嵌套 skill 渐进可见 + banner N/M 递增消失 | e2e | `tests/e2e/deep-index-progress.e2e.ts` (新) | `pnpm build && pnpm test:e2e deep-index` |
| 回归: 增量 id 稳定 / scope 过滤 / 全局浅扫 / 调度控制 / 冷启 | e2e | incremental-watch · project-scope · global-shallow-scope · scan-control · snapshot-persistence | `pnpm test:e2e <file>` 本地跑 |
| 时序观察 (A8/A11): N/M 递增、banner 消失、前台无卡顿 | manual (CDP) | dev:agent + --debug-port 冷启采集 | 4.0-verify |

## 验收标准映射

| SPEC 项 | ANALYSIS 验收标准 |
|---|---|
| C2+C5.W1+模块 project-deep-scan | A1 渐进补全, A7 id 稳定 |
| C4 排序 | A2 |
| activate 不动 (仅 preempt 钩子在 refresh 入口) + e2e 回归 | A3 |
| C3 互斥 + C4 门控②/preempt | A4 |
| C4 门控①③ + pause/resume 联动 | A5 |
| C5.W1 持久化 (envelope 规则) | A6 |
| C5.W3 | A9 |
| C1+C6 | A8, A10 |
| C4 背压 + helper 节流沿用 | A11 |
| 测试策略全表 | A12 |

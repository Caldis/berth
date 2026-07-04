# 技术方案 (Design 产物) — GH-152

每条回指 01-ANALYSIS 的验收标准 (A-B1…A-B8, A0)。0.0-new 的 8 项拆为 7 个实现项 (B7+B8 同为 index.ts 装配小项合并)。

## 任务分类与 debt

- type / maintenance.subtype: bug (无 subtype)
- source.kind / refs: user-request (refs GH-151)
- debt.estimate: incurred 3 / repaid 4 / net -1 / module / medium — 维持
- debt.final 预期: 与 estimate 持平 (无契约扩面; B5 的 close 可选方法与 GH-151 replaceBySourceKey 同模式)
- revisions: design 后 confidence medium → high (方案全锁定, 两个裁决点落定)
- Project 字段同步: ensure 已绑定; archive 时 done
- 总 debt 28 (<40), 无需 override

## 裁决记录

- **D1 (B2 判脏键)**: 资产数组**引用相等** (`indexedAssets === assets`), 不用 snapshot.id (增量变更下 id 稳定会漏重建, 见 01-ANALYSIS)、不用内容签名 (每查询 O(全库) 正是本病灶)。签名机制整体删除 (本次改动的孤儿); `addAsset/removeAsset` 既有死代码只提不删, 同步改清 `indexedAssets` 保持行为一致。
- **D2 (B4 助手归属)**: 新建 `src/main/domain-log.ts` — `logDomainFailureOnce(scope, key, err)` (进程内 `scope:key` 去重 + 经 `getMainLog()` 落盘) 与 `isFileMissingError(err)` (ENOENT/ENOTDIR 判定)。memory 与 agent-teams 两域共用 (≥2 消费点), 不进 engine 包 (域层专属, 非扫描管线)。
- **D3 (B6 退避)**: 瞬态错误码集 `SQLITE_BUSY|SQLITE_LOCKED|SQLITE_CANTOPEN|EBUSY|EPERM|EACCES`; 瞬态失败记 `nextRetryAtMs = now()+5000` (默认 5s, 构造 options 注入 `transientRetryDelayMs`/`now` 供测试); 窗口内调用直接 no-op 不试 open, 窗口后重试; 非瞬态 → `db=null` 永久放弃 (维持现状语义)。
- **D4 (B5 quit 顺序)**: before-quit = `getAssetRuntime().cancel()` (coordinator.cancelled 置位 → killed helper 的 reject 走静默丢弃, 不写伪 failed 历史; S4 清队防重启) → `getScanHelperHost().kill()` → `snapshotStore.close?.()` (checkpoint TRUNCATE + close + closed 标志防复用)。store 实例从 initAssetRuntime 内联参数提为 index.ts const。

## 数据契约

1. `SnapshotStore` 增可选 `close?(): void` (B5) — 与 `replaceBySourceKey?` 同模式, JSON/测试 store 无需实现。closed 后 load/save/replace/history 全部 no-op 不 throw。
2. `AssetSearch.ensureIndexed(assets)` 行为契约变更 (B2): 判脏 = 数组引用; 公开面 (search/buildIndex) 签名不变。
3. `buildScanEngineSettingControls` (B3): `numControl` 增可选 `supported` 参 (默认 true), `scan-concurrency`/`min-free-disk-mb` 传 false; `content-hash` 走 `boolControl` 第 5 参 false。`supported:false` 时 `editable` 同置 false (沿 osThrottle 呈现语义, 面板禁用)。
4. `createSqliteSnapshotStore(dir, openDatabase, options?)` (B6): `options = { transientRetryDelayMs?: number; now?: () => number }`。
5. 无 IPC 通道/事件增删; renderer 零代码改动。

## 模块结构 / 改动面

| # | 项 | 文件 | 要点 |
|---|---|---|---|
| T1 (A-B1) | NUL 转义 | `pkg:engine/session-replay.ts` | `\x00` 字面 → `'\0'` 转义; 键值不变 |
| T2 (A-B2) | 判脏引用化 + 删签名 | `pkg:engine/search.ts` | `indexedSignature` → `indexedAssets: Asset[]|null`; 删 `createIndexSignature`/`signatureField`/两分隔符常量; ensureIndexed 引用比对; 死代码 addAsset/removeAsset 改清 `indexedAssets` (只提不删) |
| T3 (A-B3) | supported:false | `pkg:engine/assets/settings.ts` | numControl 加 supported 参; 三控件标注; editable 联动 false |
| T4 (A-B4) | 吞错记账 | 新 `src/main/domain-log.ts` + `memory/sources/united-memory.ts` (4 点) + `claude-native.ts` (5 点) + `agent-teams/index.ts` (3 点) | 按 01-ANALYSIS 归类表逐点; ENOENT 分支静默; `scope:key` 去重 |
| T5 (A-B5) | close 契约 + quit 顺序 | `pkg:engine/assets/snapshot-store.ts`、`sqlite-snapshot-store.ts`、`src/main/index.ts` | D4 顺序; store 提 const; closed 标志 |
| T6 (A-B6) | 瞬态锁重试 | `pkg:engine/assets/sqlite-snapshot-store.ts` | D3 分类 + 退避; 与 T5 closed 标志共存 (closed 优先) |
| T7 (A-B7/B8) | 弹框节流 + 电池 seed | 新 `src/main/error-dialog-gate.ts` + `src/main/index.ts` | `createErrorDialogGate(windowMs)` 纯函数直测; `isOnBatteryPower()` seed 单行 |

顺序/并行: T1-T4 互不重叠可任意序; T5/T6 同文件 (sqlite store) 顺序; T7 独立。执行序 T1→T2→T3→T4→T5→T6→T7, 主 session 顺序推进, 每项过目标测试后单独提交 (T5+T6 可合一提交, 同文件同主题)。

## 界面质量与交互验收

renderer 零代码改动。唯一 UI 变化 = 设置面板三控件转禁用态 (既有 supported:false 语义)。verify: dev 实例截图确认三控件禁用呈现、布局无破坏; 无新交互态/无 i18n 变更 (控件文案已有)。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 |
|---|---|---|---|
| T1 键构造行为不变 | unit 回归 + 替代验证 | `session-replay-{engine,claude,codex}.test.ts`; `git ls-files --eol` 显示 `i/lf` 文本 | `pnpm vitest run tests/unit/session-replay-engine.test.ts tests/unit/session-replay-claude.test.ts tests/unit/session-replay-codex.test.ts` |
| T2 同引用不重建 / 新数组重建且新资产可搜 / 签名删除回归 | unit (spy MiniSearch.prototype.addAll) | `tests/unit/search.test.ts` | `pnpm vitest run tests/unit/search.test.ts` |
| T3 三控件 supported:false+editable:false, 其余不变 | unit | `tests/unit/scan-engine-settings.test.ts` | `pnpm vitest run tests/unit/scan-engine-settings.test.ts` |
| T4 损坏 fixture → log 记账 + 容错语义不变 + 同 key 去重 + ENOENT 零 log | unit (setMainLogWriter 注入捕获) | `tests/unit/memory-united-memory.test.ts`、`memory-claude-native.test.ts`、`agent-teams-reader.test.ts` (+domain-log 直测可并入任一) | `pnpm vitest run tests/unit/memory-united-memory.test.ts tests/unit/memory-claude-native.test.ts tests/unit/agent-teams-reader.test.ts` |
| T5 close → checkpoint+close (fake db); close 后调用 no-op | unit | `tests/unit/sqlite-snapshot-store.test.ts` | `pnpm vitest run tests/unit/sqlite-snapshot-store.test.ts` |
| T6 BUSY → 窗口内 no-op、窗口后重试成功; 非瞬态 → 永久放弃 | unit (注入 now) | 同上 | 同上 |
| T7 门控纯函数: 同 message 窗内一次/异 message 互不抑制 | unit | `tests/unit/error-dialog-gate.test.ts` (新) | `pnpm vitest run tests/unit/error-dialog-gate.test.ts` |
| B8 电池 seed | tests: not needed — electron 装配单行无逻辑分支; 替代验证 = typecheck + 代码评审 | — | — |
| index.ts before-quit 顺序 | tests: not needed — electron 装配; 替代验证 = 代码评审 + 既有 e2e 每用例关停回归 (app.close 路径) | — | — |
| 回归总闸 | 全量 | — | `pnpm typecheck && pnpm lint && pnpm test && pnpm harness:check` |

## 验收标准映射

| SPEC 项 | ANALYSIS 验收 |
|---|---|
| T1 | A-B1 |
| T2 | A-B2 |
| T3 | A-B3 |
| T4 | A-B4 |
| T5 | A-B5 |
| T6 | A-B6 |
| T7 | A-B7 + A-B8 |
| 总闸 | A0 |

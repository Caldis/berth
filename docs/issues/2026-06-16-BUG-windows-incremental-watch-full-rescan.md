# 描述
Windows 上监听到新增/变更的 **skill (glob 类能力) 文件**时, 引擎走**全量重扫** (snapshot id 变) 而非**增量折叠** (id 稳定)。macOS/ubuntu 正常增量。后果: id-keyed 消费者 (插件列表等) 在每次 windows 文件变更后被迫重取, 且每次 watched 变更触发整轮重扫 (性能回归, 非功能错误 — 变更的 skill 仍正确出现)。

GH-135 实现期回归: master CI 在 GH-134 + GH-135 早期 windows 全绿, 自 `d4f5fe4` (2026-06-15, "GH-135 D pause/resume/cancel/rebuild channel") 起 windows `incremental-watch.e2e.ts:72` 持续红 (3+ 轮同一断言, 非 flaky)。`d4f5fe4` 本身是纯增量 IPC, 真因是 GH-135 累积的 watch/derive 路径在 windows 的行为, 仅在 `d4f5fe4` 那轮首次越过失败阈值。GH-135 verify 走 macOS 真机 + macOS/ubuntu CI, 未覆盖 windows e2e, 故实现期未发现。

# 现状缺口
- `incremental-watch.e2e.ts:18` ("folds a newly-added watched skill ... id stays stable") 在 windows-2022 红: 加 `.agents/skills/added/SKILL.md` 后 `afterId !== before.id` (line 72)。
- 机制: `applyWatchEvent` (watch-wiring.ts:22) → `deriveAssetsForPath(filePath)` 在 windows 对该 skill 返回 `null` → 落 `scheduleRefresh/refresh({reason:'watcher'})` 全量路径 → `createSnapshotId()` (runtime.ts:651) 铸新 id。macOS/ubuntu 返回非 null → `applyFileChange` (runtime.ts:870, id 不变)。
- 根因候选 (derive-asset.ts 的 windows 路径处理, 待 windows 实机定位):
  - `matchCapabilityGlob` (line 124): 用 `normalizeForSuffix` (\\→/ + win32 lowercase) 匹配 glob 规则 dir/fileName/ext — 表面正确, 但 skill 规则的实际 `dir/fileName/ext` 在 windows 路径下是否命中需实机验证 (`projectCapabilitySources()` 的 skill rule)。
  - `inferScope` (line 154-162): `sep = win32 ? '\\' : '/'` 后 `fileKey.startsWith(rootKey + sep)`, 但 `dedupePathKey` 按 `normalizeForSuffix` 政策应归一为 `/` → windows 上拿 `\\` 比对 `/` 分隔的 key, startsWith 失败 → scope 误判 'user'。**此项影响 scope 非 null 性, 大概率不是本 e2e 直接红因, 但是同处真实 windows bug, 修复时一并处理。**
  - watcher (engine/watcher) 在 windows 给出的 `event.filePath` / `event.sourceKey` 格式 (chokidar windows 路径分隔/事件语义) 是否喂错 `deriveAssetsForPath`。
- 关联既有: [[2026-06-09-IMPROVEMENT-shared-path-and-type-config]] (路径/分隔符归一统一化)。

# 预期 / 建议
- windows 实机 (或 windows CI 迭代) 定位 `deriveAssetsForPath` 对 skill 返回 null 的确切分支, 修复路径分隔符/大小写归一, 使 windows 与 macOS 一致走 `applyFileChange` 增量折叠 (id 稳定)。
- 顺手修 `inferScope` 的 `sep` 与归一化 key 不一致 (windows scope 误判)。
- 验证: windows CI `pnpm test:e2e incremental-watch.e2e.ts` 绿 (macOS 无法本地复现, 仅 windows 触发)。
- 可选: 给 derive 路径补 windows 单测 (注入 `process.platform` 或抽出纯函数), 把 windows 路径行为下沉到可在任意平台跑的单测, 减少对 windows CI 往返的依赖。

# 来源 / 关联
- 来源: GH-135 归档 (2026-06-16) 的 `harness:ci:baseline` 闸门捕获 — 见 `docs/works/_archive/2026-06-15-gh-135-index-progress-visibility/`。
- CI 证据: 首红 run 27527220031 (`d4f5fe4`, 06-15) windows incremental-watch:72; 最新 run 27608429421 (`69c6227`, 06-16) 同; 末次全绿 run 27527108164 (`49ce1891`, 06-15)。
- 用户决策 (2026-06-16): 记 issue + 完成 GH-135 归档, windows 修复留专项后续。
- 状态: OPEN (windows-only 性能回归; 非阻塞 macOS/ubuntu; master CI 在 windows 上将持续红至本 issue 修复)。

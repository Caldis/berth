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
- 状态: RESOLVED (2026-06-17, GH-137)。

# 解决 (2026-06-17, GH-137)
**重分类: 非 windows 产品 bug, 实为 e2e 时序缺陷。** 本 issue 的两个产品根因候选 (matchCapabilityGlob/inferScope 路径归一致 deriveAssetsForPath 返回 null) 经 windows 实机证伪:
- chokidar 4 在 win32 发反斜杠路径, `matchCapabilityGlob` 对 codex `.agents/skills` 规则匹配正常 (dirOk+nameOk), derive 不返回 null → 走 applyFileChange (保持 id), 不走全量。
- `inferScope` 的 `sep='\\'` 与 `dedupePathKey` (`path.win32.resolve` 输出反斜杠) 本就一致, 无 bug。
- 本地 windows 实机连跑 e2e 全绿 (不复现); 现有单测 `tests/unit/derive-asset.test.ts:120` (codex `.agents/skills`) windows CI 绿。

真因 (CI ground truth: `before.id="initial"` vs `afterId="snapshot-..."`): GH-135 渐进 partial 让 seed skill 在 activate 首扫 **commit 前** (id 仍 `'initial'`) 即可见; 慢的 windows CI runner 上, e2e poll 抢在 commit 前捕获 `before.id='initial'`, 随后首扫 commit 铸新 id → `afterId !== before.id`。本地/macOS 快, before.id 已是 committed id → 绿。与 GH-117 同构 (e2e 时序非产品 bug)。

修复: 纯测试健壮性 —— `tests/e2e/incremental-watch.e2e.ts` before-poll 谓词加 `snap.id !== 'initial'`, 等首扫 commit 后再捕获基线。零产品代码 (产品不变量 "applyFileChange 保持 snapshot id" 已由 `tests/unit/agent-asset-runtime.test.ts:1062` 平台无关覆盖)。

- 关联 commit: `b060acf9` (fix, rebase 后 `3c012baa`)。
- 验证: CI run 27632710696 `verify (windows-2022)` 全绿 5m21s 含 e2e — windows 转绿确认。
- 归档: docs/works/_archive/2026-06-17-gh-137-windows-incremental-watch-full-rescan/。
- friction: docs/friction/20260617-1.0-explore-issue-hypothesis-needs-ground-truth-before-fix.md (issue 根因候选是待验证假设, explore 需先取 ground truth)。
- GitHub Issue #137 已关闭 (fix 并入 master + CI 绿)。

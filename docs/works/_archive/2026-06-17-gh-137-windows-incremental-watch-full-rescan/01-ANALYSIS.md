# 需求分析 (Explore 产物)

## 结论先行 (TL;DR)
**这是 e2e 时序缺陷, 不是 windows 产品 bug。** 来源 issue 的两个产品根因候选 (matchCapabilityGlob/inferScope 路径归一) 均经实机证伪。修复是**纯测试健壮性**改动 (incremental-watch.e2e.ts), 不动产品代码。与 GH-117 (macOS project-scope e2e 实为时序/隔离问题, 非产品 bug) 同构。

## 现状理解 (涉及进程 / 模块 / IPC 契约)
- 失败用例: `tests/e2e/incremental-watch.e2e.ts:72` `expect(afterId).toBe(before.id)`, windows-2022 CI 稳定红。
- 链路: 真实 chokidar 事件 → `AssetWatcher.notifyChange` (`packages/.../engine/watcher.ts`, `buildWatchEvent` 用 `dedupePathKey(filePath)` 作 sourceKey) → `index.ts:245` `watcher.setListener` → `applyWatchEvent` (`engine/assets/watch-wiring.ts`) → `deriveAssetsForPath` (`engine/assets/derive-asset.ts`)。
  - derive 返回非 null → `runtime.applyFileChange(sourceKey, derived)` (`engine/assets/runtime.ts:870`): spread `...this.snapshot`, **保持 id**, 仅换 assets/stats → 增量折叠。
  - derive 返回 null → `scheduleRefresh({reason:'watcher'})` → 全量 → `commitScan` (`runtime.ts:633`) → `id: this.createSnapshotId()` **铸新 id**。
- snapshot id 是不透明句柄: 只在 `commitScan` 变; `applyPartial` (`runtime.ts:843`) 与 `applyFileChange` 都 spread 现有 snapshot, **保持 id**。初始 id = `'initial'` (`createInitialSnapshot`)。

## 真因 (实证)
CI 实际断言值 (run 27608429421 / job 81626255000, windows-2022):
```
Expected: "initial"            ← before.id
Received: "snapshot-1781602961478-djnr3i"  ← afterId
```
`before.id === 'initial'` —— 即 before.id 是在 **activate 首扫尚未 commit** 时被捕获的。机制:
1. 测试 `projectScope.activate(tempProj)` 触发首次全量扫描; 扫描期间 `applyPartial` **渐进流式** seed skill 进 snapshot, id 仍 `'initial'` (GH-135 引入的进度可视化/渐进索引)。
2. 测试 poll `snapshot()` 见到 seed (经 partial, id 仍 `'initial'`) → 立即捕获 `before.id = 'initial'`。
3. 加 `added/SKILL.md` → 增量折叠 (applyFileChange, 保持 id); 与此同时 activate 首扫 **commit** → id 变 `snapshot-...`。
4. `afterId = 'snapshot-...'` ≠ `before.id = 'initial'` → 红。

windows-only 解释: windows CI 文件 I/O / chokidar / 扫描更慢, "partial 已见 seed 但首扫未 commit" 的窗口被拉宽, poll 抢在 commit 前; 本地 windows 实机 (win11) 与 macOS/ubuntu CI 扫描快, `before.id` 捕获时首扫已 commit (已是 `snapshot-...`), 增量保持该 id → `afterId === before.id` → 绿。

实证链:
- **本地 windows 实机不复现**: `pnpm build` + `pnpm test:e2e -- tests/e2e/incremental-watch.e2e.ts` 连跑 4 次全绿 (~1.8s/次)。
- **chokidar 真实路径探针** (win32, chokidar 4.0.3, 临时脚本已删): chokidar 发反斜杠绝对路径; 复刻 `matchCapabilityGlob` 判定 codex `.agents/skills` SKILL.md 规则 → `dirOk=true, nameOk=true, matched=true`。即 `deriveAssetsForPath` 不会返回 null → 走 applyFileChange (保持 id), 不走全量。
- **现有单测 `tests/unit/derive-asset.test.ts:120`** ("derives glob-class codex capabilities: skill (.agents/skills)") 用 `path.join` 反斜杠路径, windows CI 绿 → 再证 derive 在 windows 匹配正常。

## 来源两个产品根因候选均证伪
- **"matchCapabilityGlob/inferScope 致 deriveAssetsForPath 返回 null"**: 探针 + 单测证伪, windows 路径正常匹配。
- **"inferScope sep `\\` vs dedupePathKey 归一 `/` 不一致"**: `dedupePathKey` 用 `path.win32.resolve().toLowerCase()`, 在 windows 输出**反斜杠**路径 (非 `/`); inferScope `sep = win32 ? '\\' : '/'` 与之**一致**。issue 误以为 dedupePathKey 走 normalizeForSuffix (那是 derive-asset 内另一个函数), 实则 inferScope 用的是 dedupePathKey。无 bug。

## 关联与依赖
- 回归窗口: 首红 `d4f5fe4` (GH-135 D, 06-15)。GH-135 引入渐进 partial 流式 (进度可视化) 拉宽了 "id='initial' 期间 partial 已可见" 的窗口, 暴露了测试早已潜伏的假设缺陷 (把 pre-commit 的 'initial' 当稳定基线)。`d4f5fe4` 自身是纯增量 IPC, 只是首次越过 windows 失败阈值的那轮 (与 issue 描述一致)。
- 同构先例: GH-117 (macOS project-scope e2e 红, 根因是 fixture 时序/隔离, 非产品/平台 bug)。
- 关联 friction `20260609-4.0-verify-static-green-over-runtime-observation` (时序类必须真跑观察) —— 本次正是真跑观察 (CI ground truth + 本地实机) 才定位到时序真因。

## 任务分类与 debt 校准
- type: bug (保持; 但本质是 test-only 修复)。
- source.kind / refs: docs-issues / docs/issues/2026-06-16-BUG-windows-incremental-watch-full-rescan.md (+ GitHub #137)。
- debt estimate 修正: 初始 incurred 2 / scope module / risk medium / areas [architecture] (假设要改 derive-asset 产品路径)。
- 修正后: incurred 1 / repaid 0 / net 1 / scope **file** / risk **low** / areas **[testability]** / confidence **high**。
- revision: explore 实机定位后, 根因从 "windows 产品路径归一" 改判为 "e2e 未等首扫 commit 的时序缺陷", 改动面收窄到单一 e2e 文件, 不动产品代码。

## 验收标准 (逐条编号)
1. `tests/e2e/incremental-watch.e2e.ts` 在捕获 `before.id` 前, 先等待**首次扫描已 commit** (`snapshot().id !== 'initial'`, 可加 status ready) 且 seed skill 已出现; 之后再加 `added` 并断言 `afterId === before.id`。
2. 本地 windows 实机 `pnpm test:e2e -- tests/e2e/incremental-watch.e2e.ts` 绿 (含 playwright retry)。
3. 不修改任何产品代码 (`packages/berth-scan-engine/**`、`src/**`); 仅改测试文件 (必要时加测试辅助)。
4. windows CI `verify (windows-2022)` 的 incremental-watch e2e 由红转绿 (push 后旁路 CI 确认); macOS/ubuntu 不回归。
5. (可选, 设计定夺) 若要锁死回归, 补一个平台无关单测断言 "新增 skill 经 applyFileChange 后 snapshot.id 不变" (注入已 commit 的 runtime 状态), 把时序不变量下沉到任意平台可跑的单测。

## 界面质量与交互验收
不适用 (e2e 测试时序修复, 无 UI 改动)。

## 未决问题 (留给 design)
- 等待 commit 的判据用哪个: `snapshot().id !== 'initial'` (最直接) vs `status.state === 'ready'` vs `engine-info` 的 ready 信号? 倾向前者 (直接对应被测不变量), design 定。
- 是否纳入 AC5 的平台无关单测 (加深回归防护) —— 取决于是否愿意小幅扩面到一个新单测; 不改产品代码前提下成本低、价值高, 倾向纳入。
- 是否顺带给 issue 的"产品 bug"定性做修正记录 (本任务归档时回写来源 issue 的收敛, 或在 5.2 处理)。

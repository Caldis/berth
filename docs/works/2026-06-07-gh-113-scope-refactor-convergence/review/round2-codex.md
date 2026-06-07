**A**

1. `agentId` 选 `claude-code` 可以，但不能顺手保留 Claude 的 `id`。`src/main/adapters/claude-code/parsers.ts:13-16,38-49` 的 `makeId()` 带 `Date.now()`，合并后如果用 Claude asset 当主记录，AGENTS.md 的 id 每次扫描都变；`src/main/engine/assets/runtime.ts:161-162`、`src/renderer/src/components/shared/view-raw-button.tsx:13-15`、`src/renderer/src/pages/instructions.tsx:512` 都依赖 id。T1 需要稳定 canonical id，或先把 Claude AGENTS id 改稳定。

2. R-D2 不能把 shallow 项目塞回现有 `projectDirs`。`src/main/adapters/claude-code/scanner.ts:120-140,145-193,213-244` 会深扫 `**/CLAUDE.md`、skills、agents、commands、settings、mcp；`src/main/adapters/codex/index.ts:204-214,233-240` 也会扫 `.codex` 能力。`resolveScanPlan` 必须是真分支，不是字段改名。

3. 后台浅扫不能走普通 refresh/partial 通道。当前 worker 是一次性全扫：`src/main/engine/assets/worker-host.ts:57-58`、`src/main/engine/assets/worker.ts:10-20`；partial 会直接替换页面资产：`src/main/engine/assets/runtime.ts:436-443`。浅扫需要单独的低优先级任务，结果用 merge 写入 snapshot，不能覆盖活动项目深扫状态。

4. shallow→deep 的重复和闪烁不只在 AGENTS.md。`src/main/adapters/claude-code/parsers.ts:22-33` 的 `CLAUDE.md` 也是不稳定 id。浅扫根级 conventions 后，切项目深扫会生成另一批 id；没有 `scanKey/dedupeKey + deep wins`，列表 key 和详情读取都会跳。

5. T2 若早于 scope 收敛，会让项目搜索串到别的项目。`src/main/engine/assets/runtime.ts:97-100,270-278` 的 `searchScopeAllows` 对 project/global 都放行；浅索引把多项目资产放进 snapshot 后，project 搜索必须复用 `src/shared/scope.ts:78-89` 的项目过滤。

6. `missing/stale/shallow` 语义现在类型和 UI 不支持。`src/shared/types/asset.ts:14` 只有 `scanned | missing | not-scanned`；`src/renderer/src/components/layout/project-scope-switcher.tsx:22,556-563` 也只认识这三个。要么扩类型和文案，要么把 shallow 放到 `reason/meta`，别半写一个 `stale`。

7. `~/.agents/skills` 不要混进 dedupe。Codex 已扫它：`src/main/adapters/codex/index.ts:202`；health 也按 Codex 路径推断：`src/main/engine/health.ts:239-242,1409-1411`。如果要让 Claude 视图可见，只加 `readByAgentIds`，不要按 path/type 合并 skill 或 plugin component。

**B**

① 浅索引建议在首轮前台深扫完成后启动后台任务，不要首扫前抢资源，也不要只在切 global 时惰性触发。worker 用独立的一次性 shallow worker 队列，concurrency=1，加 mtime/cache；不要复用普通 refresh 的 partial 写法。

② 选中 shallow 项目升级 deep 时，先保留现有 snapshot，让过滤后的 shallow 行继续显示，再启动 `activateProjectScope` 深扫；deep 完成后按稳定 key 替换 shallow。现在 `src/renderer/src/components/layout/project-scope-switcher.tsx:121-128` 是等 `activate` 完才 `setScopeSelection`，如果要无缝显示浅数据，这里顺序要改。

③ `assets:import-chain` 不需要重指向主 id，因为它是 filePath 输入：`src/main/ipc/handlers.ts:163-164`，`src/main/engine/relations.ts:80-104` 也是按路径建树。`assets:relations` 需要注意：`src/main/engine/relations.ts:17-21` 会从 `allAssets` 找 target 并返回 `target.id`，所以只要 merge 在 cache 前完成，关系会自然指向合并后的主 id。

**C**

最小第一个增量可以是 T1，但要收窄成：只处理 AGENTS.md 指令合并 + agent view 可见性，不碰 shallow、不碰全局 scope、不碰 health。

精确改动点：

- `src/main/adapters/claude-code/parsers.ts:38-49`：给 `parseAgentsMd` 加 `meta.dedupeKey`、`meta.readByAgentIds=['claude-code']`，并解决稳定 id。
- `src/main/adapters/codex/parsers.ts:76-87`：同样加 `dedupeKey`、`readByAgentIds=['codex']`。
- `src/main/engine/scanner.ts:67-113`：新增 `mergeSharedConventions`，放在 `annotateEquivalentHookSources`、cache、stats 之前；partial 分支 `src/main/engine/scanner.ts:94-98` 也要走同一 merge，避免扫描中短暂双行。
- `src/renderer/src/lib/agent-view.ts:3-10`：新增 `assetMatchesAgentView(asset, view)`，读取 `meta.readByAgentIds`。
- 暂不改 `src/main/engine/health.ts`，暂不改 hook/mcp/equivalentSources。

T1 测试要点：

- 同一路径 AGENTS.md 被 Claude/Codex 扫到后只剩一条，`readByAgentIds` 是并集。
- 合并后 Claude 视图、Codex 视图、All 视图都能看到它。
- 同一路径 `settings.json` 的 hook/mcp 不被误合并。
- `CLAUDE.md @AGENTS.md` 的 relation target 指向合并后的 id。
- plugin component 或 skill 不因 path/type 被合并。

**D**

1. T1 AGENTS.md 合并。最易踩坑：把 `agentId=claude-code` 等同于“保留 Claude id”，导致 id 抖动；或只处理 final assets，不处理 partial，扫描时仍闪双行。

2. 先把 scope/search 收敛到 shared predicate。最易踩坑：以为只是 UI 过滤，漏掉 `src/main/engine/assets/runtime.ts:97-100,270-278` 的搜索过滤。

3. 再做 `resolveScanPlan` 和 shallow worker。最易踩坑：复用 `projectDirs`，实际触发深扫和能力扫描；或让后台 worker 走普通 refresh，把当前页面 snapshot 替换掉。

4. 做 shallow→deep 升级。最易踩坑：没有稳定 key，deep 结果无法覆盖 shallow；另一个坑是项目切换 UI 等 deep 完才切 scope，用户看不到已有 shallow 数据。

5. 最后做状态/UI/回归。最易踩坑：代码里出现 `stale/shallow`，但 `ScanSourceStatus` 和项目切换器仍只认识三种状态；测试只测列表，不测搜索、relations、raw view 和 Windows 路径大小写。
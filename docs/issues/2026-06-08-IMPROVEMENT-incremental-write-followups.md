# 描述
- GH-113 实时增量写 (I1 单管线) 已端到端落地: 根级约定文件 (CLAUDE.md / AGENTS.md / CLAUDE.local.md) 变更 → 仅重派生该文件 → `runtime.applyFileChange` 按 sourceKey 增量折叠 → SQLite 持久化 → progress 通道推 renderer。本 issue 记其已知后续 (下阶段起点)。

# 证据 / 已落地
- 切片1 `runtime.applyFileChange` 折叠机制 (提交 53d88564); 切片2 `deriveAssetsForPath` 约定文件派发 (46a16e18); 切片3 watcher 接线 `applyWatchEvent` (800e1944)。
- `deriveAssetsForPath` 当前仅覆盖约定文件; 其它类型返回 null → `applyWatchEvent` fallback 全量 `refresh({reason:'watcher'})` (与切片前行为等价)。

# 预期 / 建议 (后续, 按价值×独立性)
1. **deriveAssetsForPath 扩展能力文件**: skill/agent/command/output-mode (glob 类) + settings.json/.mcp.json/config.toml/hooks.json (单文件多资产, 按 sourceKey 整体替换其全部派生)。派发表参考 `shallow-conventions.ts` CAPABILITY_GLOBS/CAPABILITY_FILES; 需补 scope 推断 (user/project/enterprise) + plugin/sidecar (.berth/hooks-state.json) 特例。覆盖越多类型, 越少 fallback 全量重扫。
2. **真实 chokidar 端到端 e2e**: 启动 app 监听 temp project → 改 CLAUDE.md / 新增 AGENTS.md → 轮询 `window.api.assets.snapshot()` 反映增量。接线分支逻辑已单测 (`watch-wiring.test.ts`), 但 chokidar 真触发 + awaitWriteFinish 时序未端到端验证。难点: e2e 中 `is.dev=true`→`projectDir=undefined` (project-dir.ts), 需 `electron.launch({ cwd: projectDir })` 或 session-derived activate + 确认 watcher 随 activate restart 监听新 project。
3. **renderer assets:changed 订阅清理**: 切片3 退役 main 的 `assets:changed` 推送, renderer `use-ipc.ts` 的 `onChanged` 两处订阅 (syncSnapshot + refresh force) 成 dead code。可删, 或改为复用 progress 通道。未动 renderer (避免跨域冲突), 记此待评估。
4. **行级 SQLite delta (I3 增量写收口)**: 当前 `applyFileChange` 持久化走 `save(snapshot)` 全量重写 DB。可优化为 `SqliteSnapshotStore.replaceBySourceKey` (DELETE WHERE source_key=? + INSERT, source_key 列已预留)。DB 全量写本就廉价, 优先级低; 真正价值 (避免全量重扫文件系统) 已由切片1-3 兑现。

# 来源 / 关联
- GH-113 实时增量写 tier (提交 53d88564 / 46a16e18 / 800e1944)。关联 `docs/works/2026-06-07-gh-113-scope-refactor-convergence/` (03-PLAN T2 余项)。
- 状态: OPEN。

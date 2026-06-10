# 描述
- GH-113 实时增量写 (I1 单管线) 已端到端落地: 根级约定文件 (CLAUDE.md / AGENTS.md / CLAUDE.local.md) 变更 → 仅重派生该文件 → `runtime.applyFileChange` 按 sourceKey 增量折叠 → SQLite 持久化 → progress 通道推 renderer。本 issue 记其已知后续 (下阶段起点)。

# 证据 / 已落地
- 切片1 `runtime.applyFileChange` 折叠机制 (提交 53d88564); 切片2 `deriveAssetsForPath` 约定文件派发 (46a16e18); 切片3 watcher 接线 `applyWatchEvent` (800e1944)。
- `deriveAssetsForPath` 当前仅覆盖约定文件; 其它类型返回 null → `applyWatchEvent` fallback 全量 `refresh({reason:'watcher'})` (与切片前行为等价)。

# 进展 (2026-06-09, GH-113 归档时收敛)
- **item 1 (能力文件增量) DONE**: cap-1 单文件多资产 (settings/mcp/config/hooks) · cap-2 glob 类 (skill/agent/command/output-mode) · cap-3 企业域 managed-* + plugin guard + sidecar fallback (提交 fd562925/eaa6e583/a2b189e2/dc364998)。约定 + 能力全类型走增量, fallback 全量重扫已收窄到未知类型。
- **item 2 (真实 chokidar e2e) DONE**: `tests/e2e/incremental-watch.e2e.ts` 真触发 chokidar + id 稳定证明走增量 (提交 d7dd5237); 同步修 cap-4 引入的 health 不刷新 regression (08c39030)。
- **item 3 (assets:changed 清理) 已反向, 不再适用**: cap-4 health 软刷新需要 `assets:changed`, 已**恢复**该推送 + renderer `onChanged` 软刷新 (提交 08c39030), 不再是 dead code; 本条作废。
- **item 4 (cap-5 行级 SQLite delta) 仍 OPEN (低优先)**: 见下; 是本 issue 唯一剩余范围。

# 预期 / 建议 (剩余: 仅 item 4)
4. **行级 SQLite delta (I3 增量写收口)**: 当前 `applyFileChange` 持久化走 `save(snapshot)` 全量重写 DB。可优化为 `SqliteSnapshotStore.replaceBySourceKey` (DELETE WHERE source_key=? + INSERT, source_key 列已预留)。DB 全量写本就廉价, 优先级低; 真正价值 (避免全量重扫文件系统) 已由切片1-3 兑现。

# 来源 / 关联
- GH-113 实时增量写 tier (提交 53d88564 / 46a16e18 / 800e1944)。关联 `docs/works/_archive/2026-06-07-gh-113-scope-refactor-convergence/` (03-PLAN T2 cap-5)。

# 终态 (2026-06-10, RESOLVED)
- item 1/2 已完成 (cap 全类型增量 + 真实 chokidar e2e), item 3 作废 (assets:changed 已恢复为 cap-4 必需)。
- 唯一剩余 item 4 (行级 SQLite delta) 为低优先微优化 (DB 全量写廉价, 增量价值已由切片 1-3 兑现), 并入 `2026-06-07-FEATURE-background-progressive-asset-indexer.md` 主线跟踪, 本 issue 关闭。

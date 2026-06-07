# 描述
- GH-113 I3 已把默认快照后端从 JSON (`berth-snapshot.json`) 切到行级 SQLite (`berth-index.db`)。drop-in 替换不读旧 JSON, 故老用户升级后**首次冷启不再秒出** (新 DB 为空, 需等一次后台扫描完成才落盘); 旧 `berth-snapshot.json` 残留 userData 成 orphan (无害但脏)。

# 证据
- `src/main/index.ts`: 注入 `createSqliteSnapshotStore(...)` 替代 `createSnapshotStore(...)`, 不再读 `berth-snapshot.json`。
- `src/main/engine/assets/snapshot-store.ts`: `createSnapshotStore` (JSON 后端) 现仅单测引用, 生产无调用方 (保留为 `stripRaw` 宿主 + 备用后端)。
- 退化仅一次性: 扫描秒级, 之后 SQLite 接管, 数据无丢失 (只是缓存 miss)。

# 预期 / 建议
- 可选一次性迁移: 启动时若 SQLite 空且 `berth-snapshot.json` 存在, 读 JSON → `SqliteSnapshotStore.save` → 删旧 JSON。~5 行, 消除首启退化 + 清理 orphan。
- 或: 接受一次性退化 (simplicity-first), 仅加一个 "删残留 `berth-snapshot.json`" 的清理。
- 权衡: berth 扫描秒级, 退化轻微可逆, 故降级为可选改进, 未在 I3 接线本轮做。

# 来源 / 关联
- GH-113 SQLite I3 接线 (提交 85e24875)。关联 `docs/works/2026-06-07-gh-113-scope-refactor-convergence/` (03-PLAN T2)。
- 状态: OPEN。

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
- GH-113 SQLite I3 接线 (提交 85e24875)。关联 `docs/works/_archive/2026-06-07-gh-113-scope-refactor-convergence/` (03-PLAN T2)。

# 终态 (2026-06-10, RESOLVED — 按建议分支 (b) 清理落地)
- 迁移分支 (a) 已失效不选: JSON 读取器在 GH-115 T13 删除, 且 I3 上线 3 天后存量用户 SQLite 早已填充 — 一次性退化已消化, 迁移价值归零。
- 落地分支 (b): `createSqliteSnapshotStore` 在首次成功打开 DB 后 best-effort 删除 userData 残留 `berth-snapshot.json` (独立 try 隔离, 清理失败不会误判为 open 失败禁用持久化)。
- 验证: tests/unit/sqlite-snapshot-store.test.ts 新增懒打开+清理用例, 7/7 绿; typecheck/lint 绿。

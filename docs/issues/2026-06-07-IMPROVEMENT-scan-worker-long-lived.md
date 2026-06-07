# 描述
- 每次扫描都新建 worker, 并把 `sessionCache` snapshot 作为 workerData 传入、完成后又完整传回 → 资产/会话多时每轮两次 structured clone, 开销随规模放大。

# 证据
- `src/main/engine/assets/worker-host.ts:119` `runScan({ sessionCache })` 入参 + done 回传 `sessionCache`。
- `src/main/engine/assets/worker.ts` 每轮 `AssetFileCache.fromSnapshot` + `getSessionCacheSnapshot`。

# 预期 / 建议
- 改长驻 worker (跨扫描复用, cache 留在 worker 内), 或主进程持有 cache + worker 仅查询变更 fingerprint; 避免每轮双向全量序列化。需评估 worker 生命周期与项目切换的缓存隔离。

# 来源 / 关联
- Codex×Claude 对抗审查 (GH-111) Round-1 #8; Tier-2。关联 `docs/works/2026-06-07-gh-111-scan-engine-review-hardening/` (P2)。
- 状态: OPEN。

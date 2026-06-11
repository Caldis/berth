# 描述
- 每次扫描都新建 worker, 并把 `sessionCache` snapshot 作为 workerData 传入、完成后又完整传回 → 资产/会话多时每轮两次 structured clone, 开销随规模放大。

# 证据
- `src/main/engine/assets/worker-host.ts:119` `runScan({ sessionCache })` 入参 + done 回传 `sessionCache`。
- `src/main/engine/assets/worker.ts` 每轮 `AssetFileCache.fromSnapshot` + `getSessionCacheSnapshot`。

# 预期 / 建议
- 改长驻 worker (跨扫描复用, cache 留在 worker 内), 或主进程持有 cache + worker 仅查询变更 fingerprint; 避免每轮双向全量序列化。需评估 worker 生命周期与项目切换的缓存隔离。

# 来源 / 关联
- Codex×Claude 对抗审查 (GH-111) Round-1 #8; Tier-2。关联 `docs/works/_archive/2026-06-07-gh-111-scan-engine-review-hardening/` (P2)。

# 终态 (2026-06-11, RESOLVED-MERGED)
- 问题本身未修, 代码现状核实仍真实 (`worker-host.ts` 每轮 `new Worker(workerData)` 传入 sessionCache snapshot + done 回传, 双向 structured clone 仍在)。
- 但 `2026-06-07-FEATURE-background-progressive-asset-indexer.md` 自 2026-06-07 起已明文将本项并入主线 ("独立后台 worker, Codex B① 并入本 FEATURE"), worker 生命周期/缓存归属必然随主线的调度/背压/可暂停设计一并重构, 单独跟踪只会产生双账本。
- 与 `2026-06-08-IMPROVEMENT-incremental-write-followups.md` (cap-5 并入主线后关闭) 同模式: 跟踪点统一到 indexer 主 FEATURE ("仍 OPEN" 段已明列长驻 worker 项), 本 issue 关闭。

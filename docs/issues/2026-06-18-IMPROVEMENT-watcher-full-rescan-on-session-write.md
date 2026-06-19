# 描述
`applyWatchEvent` (`packages/berth-scan-engine/src/engine/assets/watch-wiring.ts`) 仅对 root-level convention 文件 (CLAUDE.md/AGENTS.md/GEMINI.md) 走增量 `applyFileChange`; 其余类型 (sessions/settings/skills/...) `deriveAssetsForPath` 返回 null → `scheduleRefresh({reason:'watcher'})` 触发**全量** scan。由于 session JSONL 在用户使用 Claude Code/Codex 时持续写入, 几乎每次会话活动都触发一次全库全量重扫。

# 重现步骤
- 使用 Claude Code/Codex (session JSONL 持续写入), 同时开着 berth。
- 观察 DB `berth-index.db` 的 scan-history。

# 预期结果
- 会话文件变更走增量 (按 sourceKey 单 session re-parse + fold), 不触发全库全量 scan。

# 实际结果
- scan-history 50 条中 49 条为 watcher 触发的全量 scan (assetCount 1318/1319), 间隔约 30s-3min, 每次 3-6s (偶发 22.9s); OS-throttle 下持续后台 CPU/IO 消耗。
- sessions 占 73% 资产 (968/1319), 是全量 scan 的主成本, 却最频繁触发全量重扫。

# 解决方案
- 待设计: session 写入走增量路径 (`deriveAssetsForPath` 支持 session 类型, 或按 sourceKey 单文件 re-parse + fold), 让任意会话写入只重算该 session, 不触发全库 scan。
- 来源 / 关联: GH-140 冷启动慢主线 explore 时发现 (`docs/works/_archive/2026-06-18-gh-140-cold-start-blocking-load`)。同根问题: session JSONL parse 是全量 scan 的主成本, 既拖慢冷启动首扫, 又被 watcher 高频触发。边界: 属稳态后台性能优化, 不在 GH-140 主线 (首屏阻塞) 顺手改, 待排期。

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
**已修复** (GH-141, 2026-06-19, commit fcae252; 发版 0.4.2)。session asset 补 `meta.sourceKey = dedupePathKey(filePath)`; `deriveAssetsForPath` 加 claude `projects/{name}/*.jsonl` + codex `rollout-*.jsonl` 增量 dispatch (subagents 排除)。会话写入走 `applyFileChange` 增量, 不再触发全库全量 scan。e2e 端到端铁证 (incremental-watch.e2e.ts: session 写入后 snapshot id 不变 = 增量, 非全量重扫)。
- 归档: `docs/works/_archive/2026-06-19-gh-141-scan-engine-reliability-incremental`
- 来源: GH-140 冷启动慢 explore 时发现 (session parse 是全量 scan 主成本)。

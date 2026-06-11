# 描述
重定义 berth 扫描模型 (用户明确, GH-113 收尾时澄清, 为后续主线):

**[全局] = 设备上所有可扫描资产的完整扫描结果** (所有项目 + 用户级 + 企业级的**约定与能力**: skill/hook/mcp/agent/command/statusline/session/约定...)。切到 用户域/项目域 **仅是对已扫完整结果的 narrow-down 过滤**, 不触发扫描。
- 应用**启动即开始扫全部**, 不是"选了才扫"。用户在 [全局] 看不到 = 等于没有, 不会等扫描。
- 因此当前"非活动项目仅浅扫约定 (conventions-only)"对用户是 **BUG** (见 [[2026-06-07-IMPROVEMENT-global-shallow-index-conventions-only]], 已被本 FEATURE 取代)。

**扫描须是后台索引服务**, 形态对标 macOS Spotlight / Windows Search Indexer:
- 后台、渐进、实时、持续、增量、可暂停、可控。
- 带缓存与失效策略 (持久化, 复用 better-sqlite3?); 增量变更检测 (chokidar/USN-like)。
- 调度/背压/限流 (优先级队列: 活动/可见优先; 空闲调度); 局部化 loading (非全局 spinner), 实时进度, 不打扰。
- **设置中暴露扫描细节与策略** (频率/间隔/并发/排除路径/content-hash/暂停/重建...), 用户按设备性能可调; 体现"专业、在干活、且用户可控"。

**性能是工程问题, 由实现解决** (局部 loading、限频、拉长间隔、缓存、增量、背压), 不得以开销为由退回"选了才扫"。

# 证据 / 现状缺口
- 当前一次性按项目全扫模型: `src/main/engine/scanner.ts` AssetScanner.scanAll; `src/main/engine/assets/worker.ts`/`worker-host.ts` (一次性 worker)。
- per-project 快照 + 切项目重扫: `src/main/engine/assets/runtime.ts` (snapshotCache/activateProjectScope)。
- GH-113 已落地可复用地基: AGENTS.md 去重 (asset-dedupe) / T3a owner 谓词 (全局完整结果 + scope narrow-down 已统一) / 确定式 id。
- 缺: 持久化资产索引、增量索引、后台调度/背压、暂停/恢复、扫描设置、全资产 (非仅约定) 的全局浅/全索引。

# 预期 / 建议 (执行计划)
- 走 cross-review 重构流程: 调研成熟索引器 + 论文 (Spotlight/Windows Search/Everything-USN/编辑器索引/调度背压/缓存失效) → 重设计 → Codex 两轮对抗 review → 分层落地。
- 调研+映射 Workflow 已启动 (run wf_46cf319a-ea8)。设计产出写入 `docs/works/2026-06-07-gh-113-scope-refactor-convergence/`。
- 关联性能后续: [[2026-06-07-IMPROVEMENT-scan-worker-long-lived]] (独立后台 worker, Codex B①) 并入本 FEATURE (2026-06-11 RESOLVED-MERGED, 见下"仍 OPEN"明列项)。

# 进展 (2026-06-09, GH-113 归档)
GH-113 已落地本 FEATURE 的地基与核心数据通路 (详见归档 INDEX「续跑指南」):
- **全局=全设备全部资产 (含能力, 非仅约定)**: `scanProjectCapabilities` owner-tag, e2e `global-shallow-scope.e2e.ts` 验证 (提交 4a17c54a)。用户核心诉求**已功能达成 + e2e 验证**。
- **持久化索引 + 冷启 SWR**: SQLite 行级真源 `SqliteSnapshotStore` drop-in 替 JSON (I3); 快照持久化 + restorePersistedSnapshot。
- **实时增量写**: 约定 + 能力全类型 cap-0~4 走 sourceKey 增量折叠, 真实 chokidar e2e (见 [[2026-06-08-IMPROVEMENT-incremental-write-followups]])。
- **可观测性 v1**: IndexHairline/IndexingInline/IndexPulse + useIndexActivity 局部 loading。
- **确定式 id**: 全 parser `assetEntityId` ([[2026-06-07-BUG-claude-makeid-nondeterministic-selection-loss]] RESOLVED)。

**仍 OPEN (本 FEATURE 主线剩余)**: T4 可暂停/可控 (协作式取消 worker checkpoint) + **设置中暴露扫描策略档位** (频率/并发/排除/重建) — 用户明确要, 最后做; 调度/背压/限流优先级队列。长驻 scan worker (跨扫描复用, 消灭每轮 new Worker + sessionCache 双向 structured clone, worker-host.ts) — 自 scan-worker-long-lived (2026-06-11 RESOLVED-MERGED) 并入本主线, 随调度/背压设计一并定 worker 生命周期与缓存归属。cap-5 行级 SQLite delta (SqliteSnapshotStore.replaceBySourceKey, 低优先) — 自 incremental-write-followups (2026-06-10 RESOLVED) 并入本主线。(JSON→SQLite 迁移项已出清: 2026-06-08-IMPROVEMENT-json-to-sqlite-snapshot-migration 已 RESOLVED @ a9959bb4, 方案为 sqlite store 打开后清理 legacy JSON。)

# GH-117 追记 (2026-06-11, 真实数据量下 scope 切换实测证据)
- macOS 真机 (主力开发机, `~/.claude` 全量真实数据) 探针实测: 切换 project scope 时 `project-scope:activate` 全量重扫耗时 **10047ms** (产出 393 资产; 对照 `set-scope` 3ms / `snapshot` 93ms), 用户面对弹层 spinner 转 ~10 秒。
- 这与本 FEATURE 的目标模型「切换仅是对已扫完整结果的 narrow-down 过滤, 不触发扫描」直接冲突 — activate 的全量重扫路径属于待消灭行为; 调度/背压落地时应一并收敛。
- 证据来源: `docs/works/2026-06-11-gh-117-project-scope-e2e-macos/01-ANALYSIS.md` 探针 C (GH-117 本体修 e2e 隔离, 性能旁支只在此处跟踪)。

# 来源 / 关联
- 用户在 GH-113 收尾澄清 (2026-06-07): "全局意味着完全完整的扫描结果, 切换只是 narrow down; 启动即扫全部; conventions-only 是 BUG; 扫描应像 spotlight/windows 索引: 后台渐进增量可控可暂停 + 可配置"。
- 关联 `docs/works/_archive/2026-06-07-gh-113-scope-refactor-convergence/`。
- 状态: OPEN (主线进行中; 地基/全局完整结果/增量写/SQLite 已落地, 余 T4 可暂停+设置档位+调度背压)。

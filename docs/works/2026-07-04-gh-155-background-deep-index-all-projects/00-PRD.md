# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 单一真源 issue: `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md` (下方全文快照 @ 2026-07-04)
- GitHub Issue: https://github.com/Caldis/berth/issues/155
- 用户任务指令 (2026-07-04): 按 harness 流程实现「后台 deep-index 全部项目」并完整跑到归档; 大件 (cross-process, 触及 scan runtime), 走完整 task-state + design checkpoint。

## 用户指令附带的关键注意 (仓库规则之外的近期上下文)

- 引擎时序/调度改动必跑 e2e (incremental-watch / project-scope), 不靠 CI 兜底; 改 runtime 共享读路径即属"搜索相关" (3.0-implement 跨切面清单有全套)。
- 相关旁支 issue 顺带对照: `2026-07-04-BUG-mid-scan-partial-clobbers-incremental-folds` (扫描中 partial 覆盖增量折叠的已知 bug, 队列扫描会放大暴露面, design 时一并裁决是否入批) 与 `2026-07-04-IMPROVEMENT-watcher-paths-fixed-at-start-blind-spot` (watch 路径集定死, deep-index 设计时一并考虑)。
- 进度 UI 属数据流/时序类, verify 必须 CDP 真跑观察 (队列推进中 N/M 递增、完成后 banner 消失), 不接受单帧截图。
- macOS e2e "sidebar footer dialog" 有 flaky 前科 (2026-07-04 三次, rerun 即绿); CI 红先按 4.0-verify 四步归因。
- 共享工作区有其他 Agent 并行 (ui-ux 维护批次在 renderer 侧), 只暂存自己的文件; 若撞 registry/契约类共享文件, 按 _shared.md 不变量 11 撞车四步法处理。
- 两个 session 的分工边界: ui-ux 批次只动 src/renderer + components/ui, deep-index 批次动 packages/berth-scan-engine/src/engine + src/main, 唯一潜在交叠是 [全局] 视图的 banner (renderer) — deep-index 批次做到那一步时先 git pull 再动, 并避开 ui-ux 批次正在拆的巨石文件。

## 正文 (docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md 全文快照)

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

# 进展 (2026-06-16, GH-135 归档)
GH-135 (`docs/works/_archive/2026-06-15-gh-135-index-progress-visibility/`) 完成本 FEATURE「仍 OPEN」主线大部:
- **T4 可暂停/可控**: runtime pause/resume/cancel/rebuild 状态机 (cancel 保留已扫 + drop late tick, rebuild 清库重扫); F2 e2e 真链路验证。
- **设置档位**: 全参数 UI 可配 (频率/间隔/并发/排除路径/背压/重建...) + 3 档预设 + 高级裸值; engine `buildScanEngineSettingControls` 产 typed 控制描述, GUI 按 kind/group 纯渲染 (符单一真源)。
- **调度/背压/限流**: 周期调度 (递归 setTimeout + nextScanAt + idleOnly/acOnly 门控 powerMonitor) + adapter 间 sleep 背压 + 排除路径过滤。
- **长驻 scan worker** (自 scan-worker-long-lived 并入主线): 落为 **utilityProcess 长驻 helper** (`src/main/scan-helper.ts` + `helper-host.ts`), 跨扫描复用, OS 节流 (mac taskpolicy / linux ionice+renice) + 崩溃自愈 (child-process-gone → 下次 scan respawn); F3/F4 真机 spike 通过。
- **可观测性深化**: ETA/速率/已扫数 (engine enrichProgress 单一真源) + 扫描历史 recharts 趋势 + 顶部指标 modal/状态 chip; engine 单一真源 / GUI 纯投影数据流重构落地。

**仍 OPEN (本 FEATURE 剩余)**:
- cap-5 行级 SQLite delta (`replaceBySourceKey`, 低优先) — 未做。
- GH-117 activate 全量重扫消灭 (切换仅 narrow-down 不触发扫描): 周期/背压已落, 但 activate 路径全量重扫的消灭未单独验证, 需后续确认。
- 下沉 issue: [[2026-06-15-IMPROVEMENT-scan-exclude-adapter-level]] (excludePaths adapter 入口剔 + respectGitignore) / [[2026-06-15-IMPROVEMENT-windows-os-level-index-throttling]] (windows IO 降优先级跨平台补全) / [[2026-06-16-IMPROVEMENT-sidebar-file-level-scan-progress]] (逐文件进度流动感)。

# 来源 / 关联
- 用户在 GH-113 收尾澄清 (2026-06-07): "全局意味着完全完整的扫描结果, 切换只是 narrow down; 启动即扫全部; conventions-only 是 BUG; 扫描应像 spotlight/windows 索引: 后台渐进增量可控可暂停 + 可配置"。
- 关联 `docs/works/_archive/2026-06-07-gh-113-scope-refactor-convergence/`。
- 状态: OPEN (主线大部已落; GH-135 完成 T4 可暂停+设置档位+调度背压+长驻 helper+可观测性深化, 余 cap-5 行级 delta + activate 全量重扫消灭 + 3 项下沉 issue, 见上「进展 (2026-06-16)」)。

# 进展 (2026-06-20, 残项核实)
- **GH-117 activate 全量重扫 (10s 卡顿症状): 已消除 + 加回归守卫**。核实路径: `project-scope:activate` (handlers.ts:221) → `activateProjectScope` (project-scope-runtime.ts:24) cache miss 走 `void runtime.refresh({ wait: false })` (line 42, 非阻塞后台刷新), cache hit 由 setProjectDir 即时取缓存; global/user 切换走 set-scope 纯客户端 narrow-down 不扫描。10047ms 阻塞路径由 commit `2786c84c` (2026-06-13, 先于 GH-135) 将 `wait:true`→`wait:false` 消除。本批加 7 行回归守卫注释 (commit `bcd9a82b`) 钉死 wait:false 防回退。49 项 project-scope/runtime 单测绿。
- **不做激进 narrow-down (有意 STOP)**: 把 activate 改为对全局快照纯过滤会丢新激活项目的嵌套能力 — 非活动项目当前仅浅索引 (root-level + conventions, 无 `**/*.md`/`.claude/` 深扫), 全局快照非完整深结果, 故后台 deep refresh 必要不可消。正确性 > 速度。
- **cap-5 行级 SQLite delta: 仍 defer** (SqliteSnapshotStore 仅全量 save; 加 replaceBySourceKey 需接口改 + applyFileChange 接线 + ord 排序 + 持久化正确性测试, 非平凡, 低优)。
- **剩余主线 (大件, 需独立 design+cross-review)**: 后台渐进 **deep-index 全部项目** (使 [全局] 真完整 → activate 可成纯 narrow-down 零扫描)。这是 FEATURE 架构主线最大剩余块, 非 activate-path 微调; 保持 OPEN。

# 设计输入 (2026-06-20, deep-index 全项目 — 已 scope, 待 cross-review + 产品决策)
现状不对称 (scope 核实): `scanner.ts:312 appendShallowConventions` 仅对**非活动**项目浅扫 (root-level AGENTS/CLAUDE + root-level `.claude/*` 能力, **无嵌套** `**/*.md` / 深层 `.claude/`); 活动项目才全深扫。故非活动项目嵌套 skill/mcp 在 [全局] **不可见** until 激活 —— 即用户定义的 BUG。
**推荐方案 (Option C, bounded first slice, ~250 行, 不动 activate/snapshot 语义)**: AgentAssetRuntime 加 `backgroundIndexQueue`, 启动后枚举所有 projectCandidates 入队, 复用 GH-135 现成 scheduler (idle/AC 门控) + 长驻 helper + backpressure, 低优逐项目 deep-scan + 增量持久化; activate 路径不变 (cache-hit 即时 / miss 后台刷新)。
**未决风险/问题 (为何 issue spec 要求调研 + Codex 两轮对抗 review)**: ① snapshot.id churn → 每项目重扫 mint 新 id 致下游 (search/health/insights) 缓存反复失效 (需 global id 与 per-project id 解耦, 或 global 按需投影不持久化); ② overfetch (用户激活队列中项目时撞扫); ③ scheduler 语义混淆 (周期重扫 active vs 队列扫 non-active 两套, 设置 UI 须澄清); ④ [全局] 完整性 SLA (eventual consistency 可能数小时, "global=complete" 心智模型); ⑤ 队列顺序 (频率/大小/随机) + 可见性 (进度 UI); ⑥ cap-5 增量 delta 耦合 (否则 N 项目 N 次全量 SQLite 重写)。①④⑤含产品决策。
**处置**: 设计已就绪 (详见本次 scope, 文件锚点: scanner.ts:312 / runtime.ts:456 scheduler / sqlite-snapshot-store / project-scope-runtime.ts:24 activate)。**唯一阻塞 = ①④⑤产品决策** (全局完整性 SLA / 队列顺序 / 进度可见性) —— 触及核心 scan/scope runtime, 决策定了即可按 Option C 落地 (落地用自审 + 对抗子代理验证, Codex 交叉评审已不再要求 2026-06-21)。保持 OPEN 待决策。

# 进展 (2026-07-04, 综合审查批次一/二顺带交付)
- **cap-5 行级 SQLite delta: DONE** (GH-151, docs/works/_archive/2026-07-04-gh-151-scan-engine-audit-fixes): `SqliteSnapshotStore.replaceBySourceKey` (DELETE WHERE source_key + 单事务行级替换) + `runtime.persistFileChange` 接线 (缺失时降级全量 save), watcher 增量不再全库重写; 附带 GH-152 退出路径 WAL checkpoint+close 与 getDb 瞬态锁退避重试。
- 关联新旁支: [[2026-07-04-IMPROVEMENT-watcher-paths-fixed-at-start-blind-spot]] (watch 路径集启动定死, 新出现的条件路径监听盲区 — deep-index 设计时一并考虑)。
- **主线剩余唯一大块 = 后台 deep-index 全部项目** (使 [全局] 真完整), 设计已 scope (Option C), **唯一阻塞 = 三个产品决策**: ① 全局完整性 SLA (eventual consistency 可接受窗口), ④ 队列顺序策略, ⑤ 进度可见性形态。决策定了即可落地。

# 产品决策落定 (2026-07-04, 用户裁决 — deep-index 阻塞解除)
- **① 完整性 SLA**: 渐进 + 明示进度。不承诺时限, spotlight 模式后台慢扫, UI 明示"已索引 N/M 项目"; 不牺牲前台性能/电量换完整速度。
- **④ 队列顺序**: 最近活跃优先 (按项目最近会话/活动时间降序), 用户最可能切换的项目最先完整。
- **⑤ 进度可见性**: 侧栏 hairline 常驻 (克制) + [全局] 视图在索引未完成时显示轻量提示 "已索引 N/M, 结果逐步补全" (完成后消失) — 保护"看不到=没有"心智, 未扫完时不让用户把"暂时看不到"误判为"不存在"。
- 技术风险 ①(id churn)②(overfetch)③(scheduler 语义)⑥(cap-5 耦合) 设计内消化; cap-5 已由 GH-151 提前交付 (replaceBySourceKey), ⑥ 耦合项已消。
- **状态: 可开工** — 按 Option C (backgroundIndexQueue + 复用 GH-135 scheduler/长驻 helper/backpressure) 走 harness 大件流程 (cross-process, 需完整 task-state + design checkpoint)。

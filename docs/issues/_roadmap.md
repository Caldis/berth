# 重构路线图 / Issue 收敛地图

## 进度 (2026-06-10, 全部已推送 + CI 绿)
- **Phase A 全部 DONE (5)**: accent-names-i18n · unused-filterbar-component · architecture-doc-drift · devagent-stop-tolerate-profile-eperm · usage-tooltip-test-flaky (已归档 resolved/)。
- **Phase B 全部 DONE (3)**: hook-disable-all ✅ (parser+UI+测试) · legacy-scanner-stale ✅ (退役死通道) · **agent-teams ✅ RESOLVED** (用户委托 UX 决策 → GH-114 运行时协作记录视图 `/teams` 落地, 已归档 resolved/; 导航级 Codex 隐藏挂新 issue agent-view-store-vestige)。
- **Phase C (1 DONE + 1 部分)**: **adapter-parsing-shared-core ✅ RESOLVED** (标量+markdown+session-artifacts+session-meta+token 别名全抽; cost 无重复不抽; memory 2 份 splitFrontmatter 变体转 engine-shared-core-package, 已归档 resolved/); shared-path-and-type-config — 路径统一 ✅, 余 asset-type 配置表/signature; renderer-cached-resource-hook ⏳ 未启动。
- **Phase D-F 未启动**: engine-shared-core-package · asset-runtime-collaborators-split · scan-worker-long-lived · FEATURE-asset-indexer T4 · json-to-sqlite-migration · incremental-write cap-5 · session-streaming-parse · heroui-followup · sessions-virtualization · macos-signing · project-scope-e2e-macos。
- 已解决计数: active 22 → 14, resolved → 59 (Phase A 5 + Phase B 3 + Phase C adapter-parsing = 9 归档; path-utils 1 项部分仍 OPEN; 新增 agent-view-store-vestige 计入 active)。
- **下一步建议**: renderer-cached-resource-hook (有界, 自主安全) → agent-view-store-vestige 需产品方向决策 (恢复 agent 切换器 vs 收敛) → Phase D 引擎重构建议有 review checkpoint。

---

> 快照: 2026-06-10, 由 `harness-5.2-issues` 收敛 22 项 active issue 生成。
> 这是**依赖×优先级排序的规划视图**, 非 phase 状态源 (phase 状态在 `docs/works/`)。
> 下划线前缀 → `harness:issues` 不计为 issue。issue 解决后请同步删除本图对应行。
> 启动任一项: `harness-0.0-new`; 续跑: `harness-0.1-continue`。

## 依赖图 (谁挡谁)

```
[架构簇 — 本批重构主线]
  architecture-doc-drift ──(改对地图)──┐
                                       ▼
  adapter-parsing-shared-core ─┐   (内核内聚 = 引擎成包的预演)
  shared-path-and-type-config ─┤───▶ engine-shared-core-package ──▶ asset-runtime-collaborators-split
  renderer-cached-resource-hook┘(并行渲染线)                          ▲           │
                                                                     │           ▼
  legacy-scanner-stale ─(退役 legacy 读路径, 为拆分清障)──────────────┘     scan-worker-long-lived
                                                                              (折入 ScanCoordinator)
[扫描索引器主线 — 依赖架构簇稳定后收尾]
  FEATURE-background-progressive-asset-indexer (T4 可暂停+设置档位+调度背压)
    ├─ json-to-sqlite-snapshot-migration (随设置/迁移 UX 一起发)
    ├─ incremental-write-followups (仅余 cap-5 行级 delta, 低优先)
    └─ session-streaming-parse (大文件流式解析, 可独立穿插)

[独立线 — 不依赖重构, 可随时并行]
  正确性 bug: hook-disable-all-not-in-effective-state · agent-teams-runtime-state-classification
  UI 长尾:    heroui-migration-followup · sessions-list-virtualization · accent-names-i18n · unused-filterbar-component
  发布/CI 基建: macos-release-signing-config · project-scope-e2e-macos · usage-tooltip-test-flaky-under-load · devagent-stop-tolerate-profile-eperm
```

## 分期 (推荐执行序)

### Phase A — 闸门 & 即时清理 (S, 无依赖, 先清场)
- `architecture-doc-drift` (S, 纯文档) — 回填 packages/ · memory/ · sqlite-snapshot-store; **是所有引擎重构的前置** (按错地图工作会扩散误导)。
- `usage-tooltip-test-flaky-under-load` (S, 测试) — flaky 阻塞推送, 先稳住 CI 闸门。
- `devagent-stop-tolerate-profile-eperm` (S, 脚本) — Windows dev:agent stop EPERM 误报, 消除"停不掉"误导。
- `accent-names-i18n` (S, i18n) — 补 6 个翻译 key, 纯增量。
- `unused-filterbar-component` (S, 死代码) — 删未使用的 FilterBar (留 ScopeSelect)。

### Phase B — 正确性 bug (用户可见错误数据, 独立于重构)
- `legacy-scanner-stale-after-project-switch` (S-M) — `handlers.ts:139/232` 仍走 legacy `getScanner()` 返回旧项目数据; **同时是 Phase D runtime 拆分的前置** (退役一条读路径)。
- `hook-disable-all-not-in-effective-state` (S) — hook 资产未反映 `disableAllHooks`, 全禁后仍显示有效。
- `agent-teams-runtime-state-classification` (M) — Agent Teams 被误建模为静态指令资产, 官方定义为运行时协作功能。

### Phase C — 内核内聚 (重构地基, "大爆炸"前的预演)
- `adapter-parsing-shared-core` (M) — 抽 `src/main/adapters/_shared/` (parser-helpers/markdown/session-artifacts); 消除 claude↔codex 复制 + `splitFrontmatter` 已漂移。
- `shared-path-and-type-config` (M) — 路径比较 5 份 → `src/shared/path-utils.ts` 1 份; 建 `asset-type-config.ts` 单一类型表 (route/icon/i18n/guidance)。**与 adapter 协调** (都碰 parsers/路径比较)。
- `renderer-cached-resource-hook` (M, 渲染线可并行) — 抽 `useCachedResource`, 4 套手写 SWR → 1。

### Phase D — 引擎成包 + runtime 拆分 (大动作, 依赖 C)
- `engine-shared-core-package` (L) — `engine/` + `shared/types`/`scope` 提升为一等包, 消灭 CLI 的 `../../../` 分层倒置; 依赖 Phase C 抽出的纯逻辑。
- `asset-runtime-collaborators-split` (L) — 拆 `AgentAssetRuntime` 上帝对象为 SelectorCache/ProjectSnapshotCache/ScanCoordinator; **不变量**: 快照 ID 稳定性 + scope 无重扫切换语义。
- `scan-worker-long-lived` (M-L) — 长驻 worker 复用 sessionCache, 消除双向序列化; 折入 ScanCoordinator 生命周期。

### Phase E — 扫描索引器主线收尾 (依赖 D 稳定的引擎)
- `FEATURE-background-progressive-asset-indexer` (L) — 主线: T4 可暂停/可控 (worker checkpoint) + 设置暴露扫描策略档位 + 调度/背压/限流。
- `json-to-sqlite-snapshot-migration` (S) — 老用户 JSON→SQLite 一次性迁移, 随设置/迁移 UX 发布。
- `incremental-write-followups` (S, 低优先) — 仅余 cap-5 行级 SQLite delta。
- `session-streaming-parse` (M) — 大 session 文件流式逐行解析, 削内存/CPU 峰值; 可独立穿插。

### Phase F — UI 长尾 & 发布基建 (并行 / 按需)
- `heroui-migration-followup` (L, 分页推进) — section 卡片 / 浮层 focus-trap / 折叠 / settings 面板 / bundle 优化。
- `sessions-list-virtualization` (L) — 800+ 会话虚拟化, 抽共享 VirtualGroupedList (memory-view 同享)。
- `macos-release-signing-config` (S) — 补 `build/entitlements.mac.plist` 或调整签名策略 (发布前)。
- `project-scope-e2e-macos` (M, 需 macOS) — `project-scope.e2e` 仅 macOS 红, 根因待定 (产品 vs e2e harness 时序)。

## 推荐下一步
**最小起步**: Phase A 的 `architecture-doc-drift` (零风险改对地图) + `usage-tooltip-test-flaky-under-load` (稳 CI)。
**重构主线起步**: Phase C 的 `adapter-parsing-shared-core` + `shared-path-and-type-config` — 它们是整个架构簇的地基, 抽完纯逻辑后 Phase D 的引擎成包才不会变成一次性大爆炸。
**先修 bug**: 若优先用户体验, 先做 Phase B 三项 (尤其 `legacy-scanner-stale`, 一箭双雕: 修数据正确性 + 为 runtime 拆分清障)。

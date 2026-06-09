# 解决 (RESOLVED 2026-06-10, 退役死通道)
- 核验发现 `assets:scan-category` 与 `hooks:statuses` 两个走 legacy `getScanner()` 的通道**均无活消费方**: scan-category 未在 preload 暴露、全仓无调用; hooks:statuses 在 preload 暴露但渲染层无调用 (实际用的是单数 `hooks:status`)。stale-data bug 是潜伏的。
- 按"简洁优先/不留投机代码"彻底退役 (优于 reroute 死通道): 删两 IPC handler + preload statuses binding + ipc 类型 + 孤立 AssetCategory 导入; 删 `scanner.ts` 孤立的 `scanCategory` 方法 + `getScanner`/`initScanner`/`_scannerInstance` 单例; 删 `main/index.ts` 的 `initScanner` 启动调用。`AssetScanner` 类保留 (worker + scan-engine CLI 独立构造)。
- legacy getScanner 读路径全仓零残留。typecheck/lint/scan-engine build+test/引擎测试全绿。提交 a471ed28。

# 描述
- legacy `getScanner()` (主线程同步 AssetScanner) 与中心 `getAssetRuntime()` (worker) 并存。项目切换只更新 runtime/watcher; 但 `assets:scan-category` 与 `hooks:statuses` IPC 仍走 legacy `getScanner()`, 该实例在启动时以启动项目初始化, 不随项目切换更新 → 切项目后这两个通道返回旧项目数据。

# 证据
- `src/main/ipc/handlers.ts:139` `assets:scan-category` → `getScanner().scanCategory(...)`
- `src/main/ipc/handlers.ts:232` `hooks:statuses` → `getScanner().getProjectDir()`
- `src/main/project-scope-runtime.ts` 只 `runtime.setProjectDir`, 未触 legacy scanner。

# 预期 / 建议
- 退役 legacy `getScanner()` 读路径, `assets:scan-category` / `hooks:statuses` 统一从 `getAssetRuntime()` 当前项目派生 (runtime 已有 getAssets/getProjectDir/scope 状态)。需核对 scan-category 的同步语义与 hooks status 的 projectDir 取值。

# 来源 / 关联
- Codex×Claude 对抗审查 (GH-111) Tier-2; 关联任务 `docs/works/2026-06-07-gh-111-scan-engine-review-hardening/` (P4)。
- 状态: RESOLVED (2026-06-10, 提交 a471ed28, 退役死通道)。

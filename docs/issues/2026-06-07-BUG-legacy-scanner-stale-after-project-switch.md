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
- 状态: OPEN (Tier-2, 未在 GH-111 实现)。

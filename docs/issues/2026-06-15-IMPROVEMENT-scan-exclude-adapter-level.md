# 描述
GH-135 B4 落地了批间 sleep 背压 + 排除路径过滤, 但排除是**结果后过滤** (scanner 跑完 adapter 后剔 path in excludePaths), 不减扫描成本; 且 `respectGitignore` setting (A1 契约) 未接入 engine。真正的成本削减需 adapter 入口层剔除 + 尊重 `.gitignore`/`.berthignore`。

# 现状缺口
- **excludePaths**: `scanner.filterExcludedPaths` 结果后过滤 (减结果集, adapter 已扫完, 不省 IO/CPU)。
- **respectGitignore**: settings 有字段 (UI 可配), engine 不读 (no-op)。
- **batchPauseMs sleep**: 无专门单测 (时序节流不改结果)。

# 预期 / 建议
- excludePaths 下沉到 adapter 文件枚举入口剔除 (worker/helper 枚举前过滤), 真正跳过扫描。
- respectGitignore: adapter 文件枚举尊重 `.gitignore`/`.berthignore` (用 ignore 库或 `git check-ignore`)。
- batchPauseMs: e2e CDP 时序或 sleep spy 端到端测背压生效。

# 来源 / 关联
- GH-135 B4 偏差 (`docs/works/_archive/2026-06-15-gh-135-index-progress-visibility/03-PLAN.md` B4)。
- 状态: OPEN (future, 非阻塞 GH-135; excludePaths 结果过滤已可用)。

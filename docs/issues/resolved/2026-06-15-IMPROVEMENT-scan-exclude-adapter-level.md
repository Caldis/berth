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
- 状态: RESOLVED (核心由 GH-142 兑现, 2026-06-19)。

# 解决 (2026-06-19, GH-142)
- 核心兑现: excludePaths 下沉到 adapter 枚举层 + respectGitignore 接入, 由 GH-142
  (`docs/works/_archive/2026-06-19-gh-142-scan-exclude-adapter-level`) 落地:
  - excludePaths/gitignore 经 glob `IgnoreLike` (childrenIgnored 剪枝) 注入 claude-code
    项目树递归 glob (`**/CLAUDE.md`, 最大 IO 成本点 / GH-117 10s 重扫根因), 真正省 readdir+parse。
  - respectGitignore 跨进程打通 (settings→runtime→worker→scanner→adapter) + 项目根
    `.gitignore`/`.berthignore` 经 node-ignore 生效; settings.ts:158 后的 no-op 修复。
  - 新增 `engine/scan-ignore.ts` (loadProjectIgnore + buildScanIgnore defaultPatterns) + `ignore@7` 依赖。
  - 测试: scan-ignore 14 + claude-code-nested-ignore 真跑临时目录 4 + 全量 1246 绿。
  - 关联 commit: 644ac4a (字段+matcher) / b273f664 (claude-code 注入)。
- batchPauseMs 背压: 实现已落 GH-135, 时序测标例外 (sleep 私有无注入点, GH-142 03-PLAN 任务5)。
- 剩余 (聚焦边界外, 已 spin off): 其他 7 adapter 枚举下沉 + 嵌套累积 gitignore →
  [[2026-06-19-IMPROVEMENT-scan-exclude-remaining-adapters-and-nested-gitignore]]。
- 收敛: 核心已兑现, 移入 resolved/。

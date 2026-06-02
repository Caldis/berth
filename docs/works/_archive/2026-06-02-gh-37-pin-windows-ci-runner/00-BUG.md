# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
GitHub Issue #37: https://github.com/Caldis/berth/issues/37

## 复现步骤
1. 查看 CI run 26796386517 的 Windows job。
2. `Set up job` 日志显示 workflow 使用 `windows-latest`, 实际 runner image 为 Windows Server 2025 / `windows-2025`。
3. GitHub Actions 页面提示 `windows-latest` 会在 2026-06-15 前重定向到 `windows-2025-vs2026`。

## 期望 vs 实际
期望: CI 使用稳定、明确的 Windows runner label, 不被 `windows-latest` 后续迁移影响。

实际: `.github/workflows/ci.yml` 的 matrix 使用 `windows-latest`, GitHub 可在没有仓库变更的情况下改变 Windows runner image。

# 需求分析 (Explore 产物)

## 现状理解

本任务只涉及 harness 自检脚本与任务目录结构, 不涉及 Electron 主进程、renderer、IPC 或外部 Agent 运行时。

相关文件:

- `scripts/harness-check.mjs`: `checkWorkflowSources(root)` 检查 `.agents/workflow` playbook 是否存在、非空, 并反向检测未知 `.md` playbook。
- `tests/harness/check.test.ts`: `checkWorkflowSources` 的单元测试已经包含空 playbook 和孤儿 playbook 用例。
- `docs/works/_archive/.gitkeep`: 保留 works archive 目录。
- `docs/friction/_archive/.gitkeep`: 保留 friction archive 目录。

当前代码已经包含 issue 描述中的两个修复点:

1. `checkWorkflowSources` 已通过 `readFileSync(...).trim().length > 0` 检测空白文件。
2. 两个 `_archive/.gitkeep` 已存在, 且 `git ls-files` 能查到。

因此本任务的实施重点不是继续改代码, 而是验证已修复状态, 将 issue 归档为 resolved。

## 关联与依赖

- `pnpm harness:check` 会调用 `checkWorkflowSources`, 该检查是 CI 与本地任务态提交的基础门禁。
- `tests/harness/check.test.ts` 是本问题的最小回归测试位置。
- `_archive/.gitkeep` 是静态目录保留文件, 不影响 archive 脚本运行逻辑。

## 验收标准

1. 空白 `.agents/workflow/<action>.md` 在 `checkWorkflowSources` 中报错, 错误包含 `empty` 和对应文件名。
2. 合规非空 playbook 全部存在时, `checkWorkflowSources(process.cwd())` 返回空错误列表。
3. `docs/works/_archive/.gitkeep` 与 `docs/friction/_archive/.gitkeep` 已被 git 跟踪。
4. `pnpm test -- tests/harness/check.test.ts` 通过。
5. `pnpm harness:check` 通过。
6. 本地 issue 文档移入 `docs/issues/resolved/`, GitHub issue 可关闭或标记为已解决。

## 界面质量与交互验收

不适用。此任务不改 UI。

## 未决问题

无。当前仓库已具备修复, 只需要验证和收束状态。


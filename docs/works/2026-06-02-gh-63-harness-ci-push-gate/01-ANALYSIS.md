# 需求分析 (Explore 产物)

## 现状理解

当前 workflow 已经在文字规则里要求 push 前查看 GitHub Actions, push 后等待当前 SHA 的 run。问题在于它依赖执行者记忆, 没有一个可运行命令把这件事固定下来。

相关文件:

- `package.json`: 已有 `harness:*` 命令, 可新增 CI gate 脚本入口。
- `.github/workflows/ci.yml`: CI workflow 名为 `CI`, push 到 `master` 时运行; Windows / Ubuntu 都会执行 lint、typecheck、test、harness:check、build, Windows 还跑 e2e。
- `scripts/harness-*.mjs`: harness 辅助脚本为 ESM Node 脚本, 测试通过 vitest 导入脚本 helper。
- `.agents/workflow/_shared.md` 和 `5.0-archive.md`: 已有文字规则, 需要补到具体命令。

## 关联与依赖

- `gh run list --branch <branch> --json databaseId,headSha,status,conclusion,workflowName,url,createdAt` 可读取分支最近 run。
- `gh run list --branch <branch> --commit <sha>` 可查找某个 SHA 的 run。
- `gh run watch <run-id> --exit-status` 可等待并把 CI failure 变成非 0 退出码。
- CI 修复提交是例外: 当远端已经红灯时, 允许用显式参数跳过红灯基线阻塞, 但脚本应在输出中标明这是例外路径。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. 提供一个脚本化命令检查当前分支最近 `CI` run; 最新 run 不是 completed/success 时默认失败。
2. 提供一个脚本化命令查找并等待当前 SHA 对应的 `CI` run; 找不到 run 或 run 失败时返回非 0。
3. 提供 package script 入口, 让 push 前本地检查和 Actions 基线检查有固定命令。
4. workflow 文档和 harness 自检能提示这条命令, 避免规则再次只停留在口头提醒。
5. 脚本核心逻辑有自动化测试, 不依赖真实 GitHub 网络。

## 界面质量与交互验收

不适用。该任务只改 CLI / workflow。

## 未决问题

无。按现有 `CI` workflow 和用户最新规则实现。

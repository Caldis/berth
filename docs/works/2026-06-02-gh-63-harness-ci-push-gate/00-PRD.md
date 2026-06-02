# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:

- 用户纠正: push 应以本地测试通过和 GitHub Actions 安全状态为条件。
- GitHub Issue: https://github.com/Caldis/berth/issues/63

## 正文

用户指出: 之前的连续任务中忽略了 GitHub Actions 的任务状态, 中间有很多 CI 失败。后续 push 前需要确保本地测试用例通过, 且不会影响 CI。

目标:

1. push 前检查当前分支最近 GitHub Actions 状态。
2. push 后等待当前 SHA 对应的 CI run。
3. 如果远端已经因为当前会话提交变红, 停止推进新功能, 先修 CI。
4. 把这条规则做成可执行命令, 不只靠 workflow 文档提醒。

# Polish

## 当前任务边界

本轮 polish 只检查 CI gate 自身的可用性和输出准确性, 不扩大到 Git hook 安装或自动拦截 `git push`。

## 候选项

- [x] `harness:ci:wait` 最终输出刷新 run 状态, 避免 watch 前的 `in_progress/pending` 误导用户。
- [x] `harness:prepush` 作为代码类提交的固定本地入口。
- [x] `harness-check` 会检查 package script 与 workflow 文档引用, 防止规则回退成口头约定。

## 用户选择

自动收口: 这是用户纠正引出的 workflow 改造, 已通过本地门禁和两轮远端 CI。

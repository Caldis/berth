# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: https://github.com/Caldis/berth/issues/41

## 复现步骤
1. 切换到中文界面。
2. 查看左侧边栏顶部 Agent 过滤器。

## 期望 vs 实际
期望:

- 全部 Agent 过滤项显示 `全部`。
- Claude / Codex 保持产品名。

实际:

- `src/renderer/src/i18n/locales/zh.json` 的 `agentView.all` 仍是 `All`。

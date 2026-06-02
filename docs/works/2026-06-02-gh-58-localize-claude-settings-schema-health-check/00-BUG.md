# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/58

## 复现步骤

1. 切到中文界面。
2. 打开 Overview 页面。
3. 查看健康检查 / Claude Code 中的 settings schema 检查。

## 期望 vs 实际

期望: `Claude settings schema is not declared` 相关 title / message / fix label / fix description 使用中文文案。

实际: 中文界面仍显示英文:

- `Claude settings schema is not declared`
- `settings.json does not declare the Claude Code settings JSON schema.`
- `Add Claude settings schema`
- `Add the official Claude Code settings schema near the top of the JSON file.`

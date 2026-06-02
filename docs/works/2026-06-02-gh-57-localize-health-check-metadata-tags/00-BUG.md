# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/57

## 复现步骤

1. 切到中文界面。
2. 打开 Overview 页面, 查看健康检查卡片中的元信息 tag。
3. 打开 Hooks 生命周期视图, hover 生命周期侧边菜单中的 Hook 检查状态 tag。

## 期望 vs 实际

期望: 健康检查元信息 tag 使用中文界面中可读的本地化标签, 例如 scope、confidence、asset type 均不直接暴露原始英文枚举值。

实际: Overview 健康检查卡片仍显示 `USER`、`medium`、`skill`、`mcp-server` 等原始英文值; Hooks 生命周期 hover 详情也直接显示 raw scope。

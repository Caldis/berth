# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/48

## 复现步骤

1. 切换到中文界面。
2. 打开 Overview。
3. 查看顶部统计卡片和健康检查分组计数。

## 期望 vs 实际

期望: 统计卡片和健康检查计数使用当前语言。

实际: `src/renderer/src/pages/overview.tsx` 中 `Skills`、`Plugins`、`error`、`warning`、`info` 为硬编码英文。

## 范围

只处理 Overview 的这些短标签, 不改健康检查标题和正文。

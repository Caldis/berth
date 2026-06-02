# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/69

## 复现步骤
- 启动应用并进入“能力”页。
- 保持 MCP tab, 展开 `openaiDeveloperDocs` MCP asset。
- 点击“查看原始文件”。

## 期望 vs 实际
- 期望: 如果 raw 内容可读取, 打开原文 drawer; 如果不可读取, 按钮应禁用或显示明确不可用提示。
- 实际: 按钮可见, `assets.get(asset.id)` 没有返回 raw 内容时点击没有任何反馈。

## 关联记录
- `docs/issues/2026-06-02-BUG-raw-button-no-feedback-without-content.md`
- GH-68 真实 UI 验收时发现。

# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/46

## 复现步骤

1. 切换 UI 语言为中文。
2. 打开左侧搜索或按 `Ctrl/Cmd+K`。
3. 查看搜索弹窗中的页面快捷入口。

## 期望 vs 实际

期望:
- 搜索弹窗中的页面名称使用当前语言。
- 中文 UI 显示 `总览`、`会话`、`指令`、`能力`、`用量`。

实际:
- `search-dialog.tsx` 中 quick actions 硬编码 `Overview`、`Sessions`、`Instructions`、`Capabilities`、`Usage`。
- 现有 renderer 测试没有覆盖搜索弹窗本地化。

# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
GitHub Issue #62: https://github.com/Caldis/berth/issues/62

## 正文
Capabilities status line view 当前把 Codex 已知 footer item 直接显示为 `model-with-reasoning`、`current-dir`。这些是 config 标识，不适合作为主要 UI 文案。

目标:
- 已知 Codex footer item 显示可读、本地化 label。
- hover title 保留 raw item id，方便核对 config。
- 未知 item 继续显示 raw 值，避免掩盖 unsupported 配置。
- 顺手修正中文里仍显示 `Footer items` 的状态栏文案。

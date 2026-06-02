# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: GitHub Issue #73 — https://github.com/Caldis/berth/issues/73

## 复现步骤
1. 启动 Electron dev 实例。
2. 打开 Settings 弹窗。
3. 用浏览器可访问性查询或 Testing Library 查询 Settings 内容中的 `role="switch"` 控件。

## 期望 vs 实际
- 期望: Advanced Mode 开关保留紧凑视觉样式, 同时暴露本地化可访问名称。
- 实际: Advanced Mode 开关只有 `role="switch"` 和 `aria-checked`, 没有 `aria-label` / `aria-labelledby` / `title`; 实测控件名称为空。

## 原始摘要
Settings dialog exposes Advanced Mode as a role="switch" control, but the button has no accessible name. Keyboard and screen-reader users cannot identify what the switch controls.

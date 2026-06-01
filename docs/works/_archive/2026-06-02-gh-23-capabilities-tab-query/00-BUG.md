# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: https://github.com/Caldis/berth/issues/23

## 复现步骤

1. 打开 `/configuration/capabilities?tab=hooks`。
2. 或从 Overview 健康检查点击指向 `/configuration/capabilities?tab=hooks` 的修复入口。

## 期望 vs 实际

期望:

- 页面应选中 Hooks 页签。
- 非法 `tab` 值应回退到默认 MCP 页签。

实际:

- 页面仍停留在默认 MCP 页签。

## 原始解决方案

- Capabilities 页面读取 `tab` query 参数并约束到已知页签。
- 页签切换时同步 query 参数, 方便刷新和分享 URL。
- 增加 renderer 测试覆盖合法和非法 query。


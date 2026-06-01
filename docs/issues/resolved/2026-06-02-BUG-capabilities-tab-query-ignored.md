# Capabilities Tab Query Ignored

## 类型

BUG

## 状态

Resolved

## 完成日期

2026-06-02

## GitHub

- Issue: https://github.com/Caldis/berth/issues/23
- Number: #23

## 背景

健康检查和诊断入口会跳转到 `/configuration/capabilities?tab=hooks`, 但 Capabilities 页面只用本地 React state 初始化页签, 没有读取 `tab` query 参数。

## 完成记录

- Capabilities 页面现在读取 URL `tab` query, 合法值会选中对应页签。
- 非法 `tab` 值会回退到默认 MCP 页签。
- 用户点击页签时, 页面同步更新 URL query, 刷新或分享链接后能保留页签状态。
- 既有 Capabilities renderer 测试已包 `MemoryRouter`, 并新增 query 初始化、非法 query 回退、点击同步 query 三个行为测试。

## 验收记录

- 新测试先失败: `tab=hooks` 仍显示 MCP, 点击 Status Line 不更新 URL。
- `pnpm test -- tests/renderer/capabilities-guidance.test.tsx` 通过, 5 tests passed。
- `pnpm typecheck:web` 通过。
- `pnpm harness:check` 通过。

## 归档

- 任务归档路径: `docs/works/_archive/2026-06-02-gh-23-capabilities-tab-query/`

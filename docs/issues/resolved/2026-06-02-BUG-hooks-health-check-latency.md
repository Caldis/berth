# Hooks Health Check Latency

## 类型

BUG

## 状态

Resolved

## 完成日期

2026-06-03

## 背景

- Hooks 页面每次切换过去时, 健康检查会卡很久。
- 这会影响高频使用的 hooks 管理流程。

## 重现步骤
- 在应用中切换到 Hooks 页面。
- 观察健康检查触发、加载时间和页面交互是否被阻塞。

## 预期结果
- 页面切换不应被健康检查长时间阻塞。
- 健康检查结果可以异步刷新, 并保留上次可用结果。
- 用户能看见正在检查的具体范围。

## 实际结果
- 切换到 Hooks 页面时健康检查明显卡顿。

## 解决方案
- 先测量 hooks 页面加载链路和 health check IPC 耗时。
- 缓存健康检查结果, 避免每次切页强制全量检查。
- 将健康检查改为非阻塞刷新, 并提供明确的 stale 状态。

## 完成记录

- GH-79 为 `assets:health-check` 增加非强制读取缓存和强制刷新两种路径。
- GH-79 为 renderer `useHealthChecks` 增加共享缓存、60s TTL、in-flight 请求去重和 assets changed 强制刷新。
- GH-79 在 Hooks 生命周期侧边栏保留旧检查结果, 后台刷新时显示 stale/refreshing 状态, 详情继续放在 hover/focus tooltip 中。
- GH-79 补齐 Overview / Hooks / health checks 相关测试, 并修复测试间模块级缓存泄漏。

## 验收记录

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` - 72 files / 548 tests passed.
- `pnpm harness:check --work docs/works/2026-06-03-gh-79-hooks-health-check-latency`
- `node scripts/harness-projects.mjs check --strict`
- agent-owned Electron `gh79-hooks-health` 实测 能力 > Hooks: 生命周期 sidebar sticky, `Hook 检查` 在 sidebar 内, 状态 tag hover/focus 可查看说明。

## 归档

- GitHub Issue: https://github.com/Caldis/berth/issues/79
- 任务归档路径: `docs/works/_archive/2026-06-03-gh-79-hooks-health-check-latency/`

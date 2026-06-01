# Polish: Hook Operation Recovery Center

## 任务边界

本任务已实现 Hook Operation Recovery Center: 主进程恢复点枚举与清理、IPC/preload 契约、Hooks 页面入口、恢复中心详情、状态解释和测试。当前补做的是 blocked 解除后的收尾, 不重新扩大到 Hook toggle、source equivalence 或 Agent Capability Plugin 的后续设计。

## 检查结果

| 项 | 结论 | 当前任务是否处理 |
|---|---|---|
| 正确性 | 恢复点状态覆盖可恢复、已恢复、冲突、损坏和源缺失; 清理只改 Berth sidecar | 已处理 |
| UI/UX | 恢复中心位于 Hooks 生命周期区域上方, 详情区域不挤压生命周期主内容; 默认不展开长列表 | 已处理 |
| 可用性 | 用户能看到来源、Agent、event、matcher、handler type、创建时间和可恢复状态 | 已处理 |
| 性能 | 详情按需加载, 不阻塞 Hooks 主视图 | 已处理 |
| 测试 | 相关 unit、renderer、lint/typecheck/test 已在任务中通过, 后续全量测试也已覆盖该区域 | 已处理 |

## 候选改进

当前任务内没有必须继续修改的 polish 项。后续可以作为独立任务处理: 让恢复中心按 Agent / source / event 分组显示, 并为同一 Hook 的多来源恢复点提供更明确的合并解释。

## 收尾记录

- 之前的阻塞来自 GitHub Project scope 缺失。
- 2026-06-02 已通过 `node scripts/harness-projects.mjs ensure docs/works/2026-06-02-gh-13-hook-operation-recovery-center` 重新绑定真实 Project item。

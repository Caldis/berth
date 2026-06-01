# Hook Toggle Conflict Recovery

## 来源

- GitHub Issue: https://github.com/Caldis/berth/issues/15
- Local issue: `docs/issues/2026-06-02-IMPROVEMENT-hook-toggle-conflict-recovery.md`

## 原始需求快照

GH-11 已经让 Claude Code 用户级 Hook 可以通过 Berth 软禁用: 保存恢复点、从 `settings.json` 移除目标 Hook、恢复时再插回去。剩余风险集中在用户、Claude Code 或其他工具并行修改同一个 `settings.json` 的场景。

需要改进:

- 禁用/恢复前重新读取源文件, 重新计算目标 scenario 与 hook hash。
- 对可恢复 stale 场景最多重算 3 次, 只要目标 Hook 仍可由 hash 定位就继续操作。
- 目标 Hook 已变化时停止写入, 返回可读冲突提示, 不覆盖文件。
- 优先实现文本级最小 JSON patch, 默认只改目标 Hook 子项或目标 matcher 容器。
- sidecar 损坏、恢复点缺失、Hook 已被手动恢复时, UI 给出明确解释和下一步建议。
- 补充同 scenario 下重复 hookHash、同 matcher group 多组、目标 Hook 手动修改、active Hook 已被手动恢复、读取后写入前外部文件变更、sidecar 损坏等单测。

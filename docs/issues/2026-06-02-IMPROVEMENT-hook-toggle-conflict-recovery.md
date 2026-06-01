# Hook Toggle Conflict Recovery

## 类型

IMPROVEMENT

## 状态

Open

## 背景

GH-11 已经让 Claude Code 用户级 Hook 可以通过 Berth 软禁用: 保存恢复点、从 `settings.json` 移除目标 Hook、恢复时再插回去。当前实现也已经有 per-file mutex、目标 Hook 子项 hash、写入前备份和 temp + rename。

剩余风险集中在高频并行修改场景: 用户手动编辑配置文件, Claude Code 自己写配置, 或其他工具同时修改同一个 `settings.json`。这类情况不应该阻断大多数正常启用/禁用操作, 但也不能静默覆盖用户刚刚写入的内容。

## 已验证事实

- 当前 Hook 身份以 scenario hash + child hook hash 为核心, 范围已经比整段配置 hash 更窄。
- 当前写入会重新序列化整个 JSON 文件, 可以保证结构正确, 但会改变格式, 也会扩大实际写入范围。
- 当前错误会直接暴露底层异常, 对“恢复点损坏”“目标 Hook 已被手动修改”“源文件已变化”解释不够清楚。

## 需要改进

- 禁用/恢复前重新读取源文件, 重新计算目标 scenario 与 hook hash。
- 对可恢复的 stale 场景最多重算 3 次, 只要目标 Hook 仍可由 hash 定位就继续操作。
- 目标 Hook 已变化时停止写入, 返回可读的冲突提示, 不覆盖文件。
- 优先实现文本级最小 JSON patch, 默认只改目标 Hook 子项或目标 matcher 容器。
- sidecar 损坏、恢复点缺失、Hook 已被手动恢复时, UI 给出明确解释和下一步建议。
- 补充单测覆盖:
  - 同 scenario 下重复 hookHash。
  - 同 matcher group 多组。
  - 目标 Hook 手动修改。
  - active Hook 已被手动恢复。
  - 读取后写入前外部文件变更。
  - sidecar 损坏。

## 验收方向

- 正常启用/禁用仍保持一步完成。
- 外部同时修改无关字段时, Berth 尽量继续完成目标 Hook 操作。
- 外部修改目标 Hook 时, Berth 不写入, 并显示冲突原因。
- 失败时保留原文件和恢复点, 不产生半写入状态。

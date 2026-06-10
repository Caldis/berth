# PRD 快照 (只读)

来源:

- 用户请求: 当前对话
- GitHub Issue: https://github.com/Caldis/berth/issues/104

## 正文

用户确认:

> 保持 sidecar 做新方案落地

上下文摘要:

- 当前 Hooks 模块有一个「恢复中心」集中展示 Claude Code Hook 恢复点。
- 用户认为集中恢复体验差, 用户追求的是在原 Hook 行「原地恢复」。
- 新方案应保留 Claude Code sidecar 作为内部恢复数据, 但废除面向用户的恢复中心模式。
- 目标体验应接近 Codex: 禁用后仍在右侧 Hook 列表原位置显示禁用状态, 用户直接在该行启用恢复。

## 目标

1. 删除或隐藏面向用户的 Hooks 恢复中心入口。
2. 保留 Claude Code sidecar, 只作为内部恢复存储。
3. Claude Code 被 Berth 软禁用的 Hook 在右侧生命周期列表中显示为禁用, 并可在原行恢复。
4. Codex 现有行内启停体验不退化。
5. sidecar 异常、来源缺失或恢复点缺失时, UI 给出局部可读错误, 不要求用户去集中恢复中心处理。

## 非目标

- 不把 Claude Code `settings.json` 改造成 Berth 私有扩展格式。
- 不改变 Claude Code 官方 Hook 配置格式。
- 不实现跨机器同步。
- 不处理项目级或 managed Hook 的写入限制。

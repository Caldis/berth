# Agent plugin manifest and version compatibility

## 类型

FEATURE

## 状态

Resolved

## GitHub

- Issue: https://github.com/Caldis/berth/issues/29
- Number: #29

## 关联任务

- 来源: `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`
- 归档: `docs/works/_archive/2026-06-02-gh-29-agent-plugin-manifest-version-compatibility/`
- 完成提交: `4aef00c`, `b452259`, `07d7a2e`

## PRD

### 背景

内置 Claude Code / Codex Agent Capability Plugin 已经能描述 sources、assets、health checks 和 hook schemas。剩余的 1.0 缺口是用户提供的 plugin manifest、schema 校验和 Agent 版本兼容。

### 范围

- 定义非内置 Agent Capability Plugin 的稳定 manifest 格式。
- 在暴露给 UI 前校验 plugin schema version、plugin id、目标 Agent 兼容性、权限、sources、assets、health checks 和 hook schema descriptors。
- 在 Settings 展示 plugin load status 和 validation errors, 不执行未知 plugin code。
- 当前阶段第三方 plugin 默认只读; 写入和执行能力必须先有权限模型和确认路径。
- 内置 Claude Code / Codex plugin 继续作为 registry entries。

### 验收

- 存在 manifest parser / validator, 且有测试覆盖。
- 无效 manifest fail closed, 并给出可操作错误信息。
- plugin version 和目标 Agent 兼容性能进入 UI 数据或状态。
- 内置 plugin 行为不变。

## 结果

- 新增只读 Agent Capability Plugin manifest parser / validator。
- `agent-plugins:list` 返回内置 plugins 和 manifest load status。
- Settings 展示 valid / invalid / incompatible manifest 状态, 展开后可看路径、版本范围和校验错误。
- 第三方 manifest 不进入 active plugin 列表, 不执行未知代码, write / execute 权限 fail closed。

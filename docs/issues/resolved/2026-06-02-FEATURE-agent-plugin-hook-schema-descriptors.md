# Agent Capability Plugin hook schema descriptors

## 类型

FEATURE

## 状态

Resolved

## GitHub

- Issue: https://github.com/Caldis/berth/issues/27
- Number: #27

## 关联任务

- 来源: `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`
- 已归档: `docs/works/_archive/2026-06-02-gh-27-agent-plugin-hook-schema-descriptors/`

## PRD

### 背景

Agent Capability Plugin 已能声明来源、资产类型和健康检查规则族, 但 Hook 页面和 hooks manager 仍保留不少 agent-specific hook schema 知识。继续推进插件化时, 需要先让内置 Claude Code / Codex 插件声明 hook event、handler type、主展示字段、必填字段和当前是否真正运行。

### 范围

- 为 Claude Code / Codex 内置插件补充 hook schema descriptors。
- 覆盖官方文档里的 hook event 和 handler type, 并标注 Berth 当前 UI/操作需要的字段。
- 运行时 hook 解析、启用/禁用、恢复点和文件写入仍保留在现有 hooks manager。
- 补测试证明 descriptor metadata 和 i18n key 稳定。

### 验收

- 内置插件暴露 Claude Code / Codex 的 hook schema descriptors。
- descriptor 能表达 lifecycle grouping、handler type、主展示字段、必填字段、是否当前可运行。
- 现有 Hooks 页面和 Settings 插件 UI 继续工作。

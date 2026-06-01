# Agent Capability Plugin source descriptors

## 类型

FEATURE

## 状态

Open

## GitHub

- Issue: https://github.com/Caldis/berth/issues/24
- Number: #24

## 关联任务

- 来源: `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`

## PRD

### 背景

GH-12 第一阶段已经把 Claude Code 和 Codex 做成内置 Agent Capability Plugin, 并在设置页展示能力、权限和来源覆盖。但 source discovery 仍主要由 adapters 自己硬编码, plugin registry 还没有完整描述“这个 Agent 理论上支持哪些来源”。

需要把 source descriptors 补进内置 plugin 元数据, 让 registry 成为 Settings 之外也能复用的真源。

### 范围

- 为 Claude Code / Codex 内置插件补充 source descriptors。
- descriptor 必须与现有 `ScanSourceCode`、scope、kind、categories 保持一致。
- source coverage 继续来自 scanner 实际结果, 但可以与 descriptors 对齐。
- 不在本任务迁移 health checks、hook actions、第三方插件加载。

### 验收

- 内置插件暴露 source descriptors, 包含 scope、kind、categories 和 scan source code。
- 可以通过 scanner source group 与 plugin descriptors 的 code 对齐得到来源覆盖。
- Settings 继续通过 `agent-plugins:list` 展示来源覆盖。
- 有测试证明 descriptor 与现有 scanner 来源 code 不脱节。

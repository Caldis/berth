# Agent Capability Plugin health check descriptors

## 类型

FEATURE

## 状态

Open

## GitHub

- Issue: https://github.com/Caldis/berth/issues/26
- Number: #26

## 关联任务

- 来源: `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`

## PRD

### 背景

内置 Claude Code / Codex 插件已经能描述来源和资产类型, 但健康检查仍完全由 `src/main/engine/health.ts` 硬编码。后续如果希望插件完整描述 Agent 能力, 需要先让插件声明它支持哪些健康检查规则。

### 范围

- 为 Claude Code / Codex 内置插件补充 health check descriptors。
- descriptor 描述规则 id、severity、category、agent、可选 asset type / scope / source code 和文案 key。
- 运行时文件读取、JSON/TOML/YAML 解析、平台判断、去重与实际检查仍留在现有 health check engine。
- 不在本任务重设计 Overview 健康检查 UI。

### 验收

- 内置插件暴露当前 Claude Code / Codex 健康检查规则族的 descriptors。
- 有测试证明 descriptor ids 与当前健康检查分类不脱节。
- 现有健康检查和 Settings 插件 UI 继续工作。

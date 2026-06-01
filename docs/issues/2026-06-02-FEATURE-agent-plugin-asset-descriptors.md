# Agent Capability Plugin asset descriptors

## 类型

FEATURE

## 状态

Open

## GitHub

- Issue: https://github.com/Caldis/berth/issues/25
- Number: #25

## 关联任务

- 来源: `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`

## PRD

### 背景

内置 Claude Code / Codex 插件已经能描述来源目录和运行时来源覆盖, 但还不能描述“这个 Agent 能解析哪些资产类型”。资产类型仍散在 adapter parser 里, Settings 也只能看到能力数量, 看不到插件对 instruction / capability / state / observability / integration 的覆盖范围。

需要给内置插件补充 asset descriptors, 让 plugin registry 继续向“完整 Agent 能力描述”前进。

### 范围

- 为 Claude Code / Codex 内置插件补充 asset descriptors。
- descriptor 必须与当前 parser / scanner 产出的 `AssetType`、category、scope 规律一致。
- 不在本任务迁移 parser 执行逻辑、health checks、hook schemas 或第三方插件加载。
- Settings 默认视图不增加噪声; 如需展示, 只能放在展开详情中。

### 验收

- 内置插件暴露 asset descriptors, 包含 asset type、category、适用 scopes 和相关 source code。
- 有测试证明 descriptor 覆盖当前 adapter 资产输出面。
- Settings 插件列表继续可渲染, 默认不平铺资产清单。

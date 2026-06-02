# 需求分析 (Explore 产物)

## 现状理解

当前 Agent Capability Plugin 已有两类数据来源:

- 内置插件由 `src/main/agent-plugins/registry.ts` 构造, Claude Code 和 Codex 始终作为 active plugin 返回给渲染层。
- 第三方 manifest 由 `src/main/agent-plugins/manifest.ts` 发现、读取和校验, 再随 `AgentCapabilityPluginListResult.manifests` 返回。

现有 manifest 状态只有 `valid` / `invalid` / `incompatible`。这能解释文件是否可读、JSON 是否有效、schema 和版本是否匹配, 但不能解释用户真正关心的“这个插件现在能不能启用”。Settings 页面也只能展示 `Manifest`、`Read-only`、`Valid/Invalid/Incompatible` 等标签, 用户需要展开错误列表才知道原因。

当前 validator 会把第三方 manifest 的 `write` / `execute` 权限直接判为 `invalid`。GH-30 需要把这个判断收窄: `write` / `execute` 是插件权限模型里的已知权限, 不是字段结构错误; 在没有权限确认模型前, 它们应该让 activation readiness 进入 blocked 状态, 而不是把整个 manifest 当成结构无效。未知权限值、字段缺失、schema 错误仍然是 invalid。

第三方 manifest 目前没有 implementation 元数据。即使 manifest 描述了 source、asset、health check 或 hook schema, 也不会注册 parser、scanner 或 action handler。GH-30 的合理边界是增加只读 readiness 分类, 不执行第三方代码, 不把第三方 manifest 合并进 active plugin 列表。

## 关联与依赖

- 共享类型: `src/shared/types/agent-plugin.ts` 是主进程、preload IPC 和渲染层共同使用的数据契约。新增 readiness 字段必须从这里开始。
- 主进程校验: `src/main/agent-plugins/manifest.ts` 负责 manifest 结构校验、版本兼容判断、重复 id 判断和状态输出。readiness 应在这里计算, 避免渲染层重新推断安全状态。
- 插件 registry: `src/main/agent-plugins/registry.ts` 仍然只返回内置 active plugins; 第三方 manifest 继续只进入 `manifests`。
- Settings UI: `src/renderer/src/components/settings/agent-capability-plugins-section.tsx` 需要展示 metadata-only、activation-ready、blocked、invalid、incompatible 等状态, 并在展开详情里说明原因。
- i18n: Settings 文案需要同步更新 `src/renderer/src/i18n/locales/en-US.ts` 和 `src/renderer/src/i18n/locales/zh-CN.ts`。
- 测试: 需要覆盖 manifest validator、registry 返回数据、Settings 渲染。已有测试文件可直接扩展: `tests/unit/agent-plugin-manifest.test.ts`、`tests/unit/agent-capability-plugins.test.ts`、`tests/renderer/settings-agent-plugins.test.tsx`。

## 验收标准

1. `AgentCapabilityPluginManifestEntry` 包含用户可见的 activation readiness 数据, 至少能表达状态、原因码和原因文本。
2. 只有 read 权限且没有 implementation 声明的 manifest 展示为 metadata-only。
3. 只有 read 权限且声明了可识别 implementation 元数据的 manifest 展示为 activation-ready, 但不会自动加入 active plugin 列表。
4. 声明 `write` / `execute` 权限的 manifest 展示为 blocked, 并在详情里说明当前没有权限确认模型, 因此不能启用。
5. Agent 版本不匹配时仍展示为 incompatible, 且 readiness 也指向版本不兼容原因。
6. schema、字段类型、未知权限值、重复 id、非 https 引用等结构问题仍展示为 invalid。
7. 内置 Claude Code / Codex 插件行为不变。
8. 单元测试和 Settings 渲染测试覆盖上述状态。

## 界面质量与交互验收

Settings 当前使用列表行 + 展开详情的结构, 信息密度适合插件管理。GH-30 不应把 readiness 解释文案平铺到列表里, 否则会回到之前“解释内容占用主路径空间”的问题。

界面验收:

1. 列表行保留紧凑结构: 名称、版本、目标 Agent、状态标签和路径摘要。
2. readiness 标签必须短: 例如 Metadata、Ready、Blocked、Invalid、Incompatible。原因文本放到展开详情。
3. blocked / incompatible / invalid 的区别必须一眼可见, 不用用户阅读错误 code 才能判断。
4. 展开详情必须展示 path、目标 Agent、version range、detected version、readiness reason 和 validation errors。
5. 无 implementation 的 metadata-only manifest 不应出现“启用”按钮, 避免误导用户以为已经可扫描或可执行。
6. 移动宽度下标签允许换行, 路径使用 monospace truncate, 不能挤压名称。
7. focus、hover、`aria-expanded` 沿用现有按钮交互, 不引入额外弹窗或 hover-only 信息。

## 未决问题

无阻塞问题。Design 阶段需要确定 implementation 元数据的最小 schema。建议范围只覆盖声明式元数据, 例如 `implementation.kind`, 不接入真实 adapter 加载。

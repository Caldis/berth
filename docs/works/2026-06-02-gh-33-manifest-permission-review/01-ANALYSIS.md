# 需求分析 (Explore 产物)

## 现状理解

本任务是 Settings 中 Agent Capability Plugin 的第三方 manifest 展示改进, 不涉及外部 Agent 官方契约。现有链路是:

- 主进程 `src/main/agent-plugins/manifest.ts` 发现并校验第三方 manifest。
- 共享类型 `src/shared/types/agent-plugin.ts` 定义 `AgentCapabilityPluginManifestEntry`, 渲染层只能使用这个对象。
- Settings 入口 `src/renderer/src/pages/settings` 通过 `window.api.agentPlugins.list()` 读取内置插件和 manifest 列表。
- 展示组件 `src/renderer/src/components/settings/agent-capability-plugins-section.tsx` 负责摘要、展开详情、权限、来源、能力和 readiness 状态。

当前 validator 已经读取并校验 `permissions` 数组。每条 permission 需要:

- `kind`: `read | write | execute`
- `scopes`: user/project/enterprise/session 范围数组
- `pathPatterns`: 非空字符串数组
- `reason`: 非空字符串

但 `validateAgentPluginManifest()` 返回的 `AgentCapabilityPluginManifestEntry` 只保留:

- manifest 基础字段
- implementation metadata
- activationReadiness
- agentCompatibility
- errors

permission 明细没有进入返回对象。`activationReadiness.blockedPermissionKinds` 只保留 `write` / `execute` 的 kind, 因此 UI 只能显示 “Blocked permissions: Write / Execute”, 不能展示路径、范围和原因。

PRD 中提到 write 权限还应展示备份策略和冲突策略。当前 manifest schema 没有对应字段, validator 也没有解析这些字段。本任务不直接扩 schema 到写入策略, 否则会把只读审查任务扩大成 manifest schema 设计任务。这里先把已经存在且已校验的权限字段完整展示出来, 为后续写入策略字段预留位置。

## 关联与依赖

- `src/shared/types/agent-plugin.ts`: 需要新增第三方 manifest permission 的共享类型, 不能复用内置 `AgentCapabilityPluginPermission` 的 `reasonKey`, 因为第三方 manifest 的原因是普通字符串。
- `src/main/agent-plugins/manifest.ts`: 需要把 `validatePermissions()` 从仅校验改成校验并返回可展示的权限数组。校验错误时仍要 fail closed。
- `src/renderer/src/components/settings/agent-capability-plugins-section.tsx`: 需要在 manifest 详情中增加权限审查区域。它应该出现在 readiness 附近, 因为用户展开 manifest 时主要是在判断它为什么不能启用、是否可信。
- `src/renderer/src/i18n/locales/en.json` 与 `zh.json`: 需要补充 manifest permission 区域标题、空态、字段标签和 pending strategy 文案。
- `tests/unit/agent-plugin-manifest.test.ts`: 需要验证有效 manifest 返回权限明细, invalid manifest 不返回伪造权限明细。
- `tests/renderer/settings-agent-plugins.test.tsx`: 需要验证 blocked manifest 展开后能看到每条权限的 kind、scope、path pattern 和 reason。

现有设计系统使用 Tailwind + 小字号 badge + 展开详情。Settings 里内置插件权限已经用 `PermissionRow` 展示 pathPatterns 和 reason, 第三方 manifest 可以使用相同的信息密度, 但不能假装它们是内置可执行权限。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. valid manifest 的 `AgentCapabilityPluginManifestEntry` 包含经过校验的 `permissions` 明细。
2. manifest permission 明细包含 `kind`, `scopes`, `pathPatterns`, `reason`; 第三方 reason 作为普通字符串展示, 不走 i18n key。
3. `write` 和 `execute` 权限继续让 activation readiness 进入 `blocked`, 不因为展示明细而变成可启用。
4. invalid manifest 不应返回半解析且可能误导用户的 permission 明细; 校验错误仍显示在 validation errors 区域。
5. Settings 展开 manifest 后展示权限审查区域; read/write/execute、scope、path pattern、reason 都能被用户看到。
6. 缺少备份策略和冲突策略时, UI 应明确显示这些策略尚未声明, 但不把它们作为当前 schema 校验错误。
7. 摘要行不增加噪音; 权限明细只在用户展开详情后显示。
8. 中文和英文界面都具备完整文案。
9. 目标单元测试和 renderer 测试覆盖新增行为。

## 界面质量与交互验收

- 页面结构: Settings 下的 Agent Capability Plugins 是一个折叠列表; 内置插件和 manifest 混排。摘要行负责状态识别, 详情区域负责解释。
- 设计系统: 现有组件使用 `Badge`, `DetailBlock`, border/divide 分割, 小字号正文和 mono path。新增区域应复用这些模式。
- 信息密度: manifest 权限不应放到摘要行。展开详情后按权限逐条显示, path pattern 使用 mono 行, 原因使用短正文。
- 主要用户路径: 用户看到 manifest `Blocked` 标签 -> 展开 -> 阅读 activation readiness -> 查看具体权限路径和原因 -> 理解为什么暂不能启用。
- 可见状态: metadata-only、activation-ready、blocked、incompatible、invalid 都应保留现有语义。blocked 需要额外显示受限权限明细。
- 交互反馈: 展开按钮已有 `aria-expanded`; 新增内容不增加新的复杂交互。
- 响应式: 当前详情区域在小屏为单列, 新权限区域应使用流式布局和可截断 path, 避免横向溢出。
- 可访问性: 不用仅靠颜色表达权限风险; write/execute 同时用文字 badge 表示。

## 未决问题

无。当前任务可以按只读审查实现。备份策略和冲突策略字段的 schema 扩展留给后续单独任务。

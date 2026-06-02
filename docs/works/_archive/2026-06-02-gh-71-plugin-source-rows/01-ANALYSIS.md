# 需求分析 (Explore 产物)

## 现状理解
涉及的进程 / 模块 / IPC 契约 (参 docs/ARCHITECTURE.md)。

- 页面入口: `src/renderer/src/pages/settings.tsx` 渲染 `AgentCapabilityPluginsSection`。
- 数据来源: `useAgentCapabilityPlugins()` 通过 IPC 读取 `AgentCapabilityPluginListResult`。
- 内置插件来源数据: `src/main/agent-plugins/registry.ts` 里 `buildSourceCoverage()` 将 scan roots 转成 `sourceCoverage.sources`。
- 当前 UI: `PluginDetails -> SourceCoverageDetails` 只渲染状态 tag 和 `{{scanned}} scanned · {{missing}} missing · {{notScanned}} not scanned`。
- 对比已有局部实现: `LocalSourcesSection` 已能展开具体 source row, 但它是按扫描根分组, 不是按 Agent Capability Plugin 视角展示。

## 关联与依赖
调用关系、region/scope 差异、历史设计取舍。

- 本任务只改 Settings 的插件详情, 不改扫描器、manifest validator 或 IPC 数据结构。
- `AgentCapabilityPluginSource` 已包含 `path`, `scope`, `status`, `code`, `kind`, `categories`, `declared`, `pathPattern`, `labelKey`, `descriptionKey`; 不需要新增后端字段。
- i18n 已有 `settings.agentPluginSourceStatus.*` 和 `common.scope.*`; 缺少 `kind`, `declared`, `path pattern`, `no sources` 等插件来源行专用文案。
- 这属于渐进披露: collapsed row 仍只显示摘要; expanded detail 展示可行动细节。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 展开内置插件详情后, Sources 区域能列出每个 `sourceCoverage.sources` 的具体行。
2. 每行能看到状态、scope、kind、categories、实际路径或 descriptor path pattern、是否来自 declared descriptor。
3. 没有 sources 时展示紧凑空态, 不只显示一串 0。
4. 插件折叠时不显示来源行, 保持当前低噪声摘要。
5. 中英文文案完整, 长路径不撑破布局。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。

- 现有 Settings 使用 8px 左右圆角、border 分隔、`text-xs` 和 muted tag, 信息密度适合配置页。
- 本任务不新建卡片套卡片; Sources detail 内用 `divide-y` 列表和小号 tag。
- 长路径使用 `truncate` + `title`, 避免在设置弹窗或窄屏上撑开。
- 来源行只在 expanded 状态出现, 不打断默认浏览。

## 未决问题
留给 design 向人澄清。

无。

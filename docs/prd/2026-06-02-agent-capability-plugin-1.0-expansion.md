# Agent Capability Plugin 1.0 Expansion PRD

## 背景

当前 Berth 已完成 Agent Capability Plugin 的第一组核心能力:

- Claude Code / Codex 内置插件 registry。
- sources、assets、health checks、hook schema descriptors。
- Hooks 页面从 plugin hook schema 读取展示字段。
- 第三方 manifest 的只读发现、fail closed 校验、版本兼容状态和 Settings 展示。

这些能力足以让应用解释“某个 Agent 当前能被 Berth 如何读取和展示”。但 1.0 若要支持 Hermes、PI 或其他 Agent, 还需要把第三方插件从“只读 manifest 状态”推进到“可审查、可安装、可启用”的能力。

## 目标

- 支持用户安装本地或下载的 Agent Capability Plugin。
- 第三方插件可以被启用为 active plugin, 但必须经过权限审查。
- 插件版本、Agent 版本兼容、schema 版本和来源可信度在 UI 中清楚展示。
- 支持插件草案生成流程: 基于 Agent 官方文档和源码生成 manifest / descriptor / adapter 草案, 再由维护者审核。
- 为 Hermes / PI 接入提供稳定流程, 避免页面、IPC、health engine 和 parser 再散落 agent-specific 判断。

## 非目标

- 不默认执行第三方插件代码。
- 不允许第三方插件绕过 Berth 的权限确认写入本地文件。
- 不做后台自动更新。
- 不把远程市场做成唯一入口; 本地文件和项目内插件也必须可用。

## 功能范围

### 插件安装与来源

- 支持本地插件目录。
- 支持项目级 `.berth/agent-plugins/`。
- 支持只读 manifest 文件和完整 plugin package 两种形态。
- 后续可支持远程索引, 但远程下载必须有来源、版本和校验信息。

### 权限审查

- `read`: 默认可展示, 用户可禁用。
- `write`: 必须展示目标路径、写入原因、备份策略和冲突策略。
- `execute`: 必须默认禁用, 用户确认后才可启用。
- 权限状态应进入 Settings, 并能解释为什么某个插件不能启用。

### Active plugin

- 通过 validator 的 manifest 仍不自动成为 active plugin。
- active plugin 需要额外声明可用 adapter / parser / action implementation。
- 未绑定 implementation 的插件只能作为 metadata plugin 展示。
- 每个 active plugin 必须有版本兼容判断和禁用路径。

### 插件生成流程

- 输入: Agent 官方文档、源码路径、样例配置、已有 session / hook / skill 文件。
- 输出:
  - manifest 草案。
  - source / asset / health / hook descriptors。
  - adapter 扫描入口草案。
  - 权限声明草案。
  - 测试 fixture 草案。
- 输出必须标记为 draft, 不能直接启用写入和执行权限。

### Hermes / PI 接入

- 先生成 metadata plugin, 展示来源和资产描述。
- 再实现 adapter 扫描和 parser。
- 最后按权限模型接入可写操作。

## 验收方向

- Settings 能区分内置、metadata-only、active third-party、invalid、incompatible plugin。
- 第三方插件启用前能看见权限和兼容性说明。
- 无 implementation 的 manifest 不会被误认为已可扫描或可写。
- Hermes / PI 的第一版接入可以通过新增 plugin + adapter 完成, 不需要改多个页面的 agent-specific 分支。
- 插件生成流程能产出可审查草案和测试 fixture。

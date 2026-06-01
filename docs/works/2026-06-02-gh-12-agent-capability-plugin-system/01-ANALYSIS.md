# 需求分析 (Explore 产物)

## 现状理解

Berth 现在已经有两层 Agent 相关抽象, 但职责还没有统一到用户可理解的插件概念。

- `src/main/adapters/claude-code/index.ts` 和 `src/main/adapters/codex/index.ts` 的 `AgentAdapter` 负责 detect、source coverage 和资产扫描。它能说明“从哪里读”和“读出了什么”, 但不描述 hook 操作、健康检查、UI 文案或权限。
- `src/main/engine/health.ts` 直接写死 Claude Code / Codex 的健康检查、证据 URL、hook 支持差异和部分 UI 路由。
- `src/main/engine/hooks-manager.ts` 负责 hook 总开关、单 hook 启用/禁用和恢复点。这里已有真实写入行为, 但这些能力没有在设置页统一解释。
- `src/shared/types/ipc.ts` 是主进程到渲染进程的类型契约。新增只读插件列表需要补 IPC channel、preload API 和 renderer mock。
- `src/renderer/src/pages/settings.tsx` 目前展示 Appearance、Scanning、Local Sources、About。用户需要的 `Agent Capability Plugins` 入口应位于 Scanning 与 Local Sources 之间: 先看扫描行为, 再看 Agent 插件能力, 最后看具体路径。

官方文档差异会影响插件元数据:

- Claude Code hooks 官方文档说明 hook handler 有 `command`、`http`、`mcp_tool`、`prompt`、`agent` 五类, `/hooks` 也显示这五类。来源: https://code.claude.com/docs/en/hooks
- Claude Code 官方文档同时说明没有“保留注册但单独禁用一个 hook”的原生机制, 只能删除条目或使用 `disableAllHooks`。Berth 的软禁用是应用层能力, 不能说成 Claude Code 原生能力。
- Codex hooks 官方文档说明 `commandWindows` / `command_windows` 是 Windows 覆盖字段, `async` 会被解析但跳过, 当前只有 `type: "command"` 会执行, `prompt` 和 `agent` 会解析但跳过。来源: https://developers.openai.com/codex/hooks

## 关联与依赖

- 主进程:
  - `src/main/adapters/*` 提供扫描来源和资产解析能力。
  - `src/main/engine/scanner.ts` 提供 `getScanSourceGroups()`。第一版插件列表应复用这个缓存状态, 避免打开设置页触发昂贵扫描。
  - 新增 registry 应保持纯函数, 输入扫描来源组, 输出只读插件元数据。
- 共享契约:
  - `src/shared/types/ipc.ts` 需要新增 `AgentCapabilityPlugin*` 类型和 `agent-plugins:list` channel。
  - 如果类型较多, 可放入 `src/shared/types/agent-plugin.ts`, 再由 IPC 引入。
- preload:
  - `src/preload/index.ts` 和 `src/preload/index.d.ts` 必须同步新增 `window.api.agentPlugins.list()`。
- 渲染层:
  - `src/renderer/src/hooks/use-ipc.ts` 新增 `useAgentCapabilityPlugins()`, 返回 `plugins`、`loading`、`error`。
  - `src/renderer/src/components/settings/agent-capability-plugins-section.tsx` 新增设置页区块, 避免把 settings.tsx 变成大组件。
  - `src/renderer/src/i18n/locales/{zh,en}.json` 增加设置页文案。
- 测试:
  - registry 输出用 unit test 覆盖。
  - Settings 展示用 renderer test 覆盖。
  - `tests/setup.ts` 需要补 mock, 避免其他 renderer 测试缺 API。

## 验收标准

A1. 设置页能列出 Claude Code 和 Codex 两个内置 `Agent Capability Plugin`, 显示名称、版本、内置状态、启用状态和目标 Agent。

A2. 插件列表通过只读 IPC 获取, renderer 不直接导入主进程模块, 也不直接读取本地文件。

A3. 每个插件能展示权限说明, 至少覆盖 read/write 两类。第一版不得宣称 Berth 会执行外部命令, 因为当前应用只是扫描、展示和写配置。

A4. 每个插件能展示能力状态, 明确区分 available、partial、planned。Codex hook handler 必须标出“只执行 command; prompt/agent 仅解析或规划中”的差异。

A5. 插件 source coverage 与现有扫描来源保持一致, 显示 scanned / not-scanned / missing 数量, 不在打开设置页时触发全量重扫。

A6. UI 默认紧凑, 权限、能力和来源细节放在展开区, 不占用设置弹窗的默认高度。

A7. 变更有自动化测试: registry 单测、Settings renderer 测试、node/web typecheck, harness check。

## 界面质量与交互验收

- Settings 弹窗宽度有限, 不能默认平铺长说明和长路径。
- 采用已有设置页 `section + h2 + bordered panel + expandable row` 模式, 但视觉应更克制: 黑白中性为主, tag 用细边框, 不沿用过重橙色强调。
- 默认行展示用户最关心的内容: 插件名、版本、内置、启用、检测状态、能力数量。
- 展开区再展示:
  - 权限: kind、路径范围、原因。
  - 能力: capability label、状态、简短说明。
  - 来源: scanned / not-scanned / missing 计数。
- 加载态和空态必须存在。空态不能说“没有插件”导致误解, 应表达“插件注册表暂不可用”。
- 响应式上不能出现长路径撑宽弹窗, 路径用 `truncate` 或横向可复制的短行展示。

## 未决问题

- 第三方插件下载、加载、签名、更新和禁用策略不在第一版处理。
- Hook lifecycle 页面仍会继续使用现有硬编码映射。第一版只建立插件元数据和设置页入口, 后续再迁移 hook schema-driven UI。
- 插件版本暂使用 Berth 内置插件 schema 版本, 不尝试识别真实 Claude Code / Codex CLI 版本范围。

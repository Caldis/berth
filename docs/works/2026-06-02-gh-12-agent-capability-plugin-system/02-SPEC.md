# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增共享类型文件 `src/shared/types/agent-plugin.ts`。

核心结构:

```ts
export interface AgentCapabilityPlugin {
  id: AgentCapabilityPluginId
  displayName: string
  version: string
  schemaVersion: number
  builtin: boolean
  enabled: boolean
  detected: boolean
  agentCompatibility: {
    agentId: AgentPluginAgentId
    name: string
    versionRange?: string
  }
  capabilities: AgentCapabilityPluginCapability[]
  permissions: AgentCapabilityPluginPermission[]
  sourceCoverage: AgentCapabilityPluginSourceCoverage
  references: AgentCapabilityPluginReference[]
}
```

字段约束:

- `enabled`: 表示 Berth 内置插件启用, 不是 Agent 本身的配置开关。
- `detected`: 由扫描来源组的 `installed` 推导, 表示本机发现了该 Agent 的数据来源。
- `permissions`: 只描述 Berth 目前会做的动作。第一版只允许 `read` 和 `write`, 不添加 `execute` 权限。
- `capabilities[].status`: `available | partial | planned`。解析但不会执行的能力必须是 `partial`, 未接入 registry 分发的能力也不能写成 `available`。
- `sourceCoverage`: 从 `AgentScanSourceGroup.sources ?? roots` 统计 `scanned`、`not-scanned`、`missing`。

新增 IPC channel:

```ts
'agent-plugins:list': { args: []; result: AgentCapabilityPluginListResult }
```

主进程实现只读 handler, 调用 registry:

```ts
const groups = getScanner().getScanSourceGroups()
return listAgentCapabilityPlugins(groups)
```

## 模块结构 / 组件拆分

- `src/main/agent-plugins/registry.ts`
  - 内置 Claude Code / Codex 插件定义。
  - `listAgentCapabilityPlugins(groups: AgentScanSourceGroup[]): AgentCapabilityPluginListResult`。
  - 保持纯函数, 不读写文件, 方便单测。
- `src/main/ipc/handlers.ts`
  - 注册 `agent-plugins:list`。
- `src/preload/index.ts` / `src/preload/index.d.ts`
  - 暴露 `window.api.agentPlugins.list()`。
- `src/renderer/src/hooks/use-ipc.ts`
  - 新增 `useAgentCapabilityPlugins()`。
- `src/renderer/src/components/settings/agent-capability-plugins-section.tsx`
  - 新增设置页区块。
  - 默认只展示摘要; 点击展开展示权限、能力和来源覆盖。
- `src/renderer/src/pages/settings.tsx`
  - 在 Scanning 之后、Local Sources 之前插入区块。
- `src/renderer/src/i18n/locales/{zh,en}.json`
  - 新增 `settings.agentPlugins*` 文案。

## 界面质量与交互验收

- 不做新的大面积视觉主题切换, 但该区块采用更克制的黑白中性视觉: 细边框、紧凑 tag、低饱和状态色。
- 每个插件是一行可展开项:
  - 左侧: 展开图标、插件名、版本、Built-in、Enabled、Detected。
  - 右侧: source coverage 摘要。
  - 展开区: 三列在宽屏, 窄屏堆叠; 权限和能力使用紧凑列表。
- 默认状态不展示长路径。展开后路径仍必须截断, 防止设置弹窗横向溢出。
- 加载态复用现有文字加载方式; 空态复用 `EmptyState`。

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| registry 输出两个内置插件、权限、能力和 source coverage | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm test -- tests/unit/agent-capability-plugins.test.ts` |  |
| IPC/preload 类型可编译 | typecheck | `src/shared/types/ipc.ts`, `src/preload/index.d.ts` | `pnpm typecheck:node` |  |
| Settings 展示插件入口和展开详情 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm test -- tests/renderer/settings-agent-plugins.test.tsx` |  |
| Settings 与 renderer hook 可编译 | typecheck | renderer | `pnpm typecheck:web` |  |
| harness 任务态有效 | harness | docs | `pnpm harness:check --work docs/works/2026-06-02-gh-12-agent-capability-plugin-system` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 共享类型 + registry + IPC | A1, A2, A3, A4, A5 |
| Settings 插件区块 | A1, A3, A4, A5, A6 |
| 测试与门禁 | A7 |

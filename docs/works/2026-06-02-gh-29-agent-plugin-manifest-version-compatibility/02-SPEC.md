# 技术规格 (Design 产物)

## 范围

本任务实现 Berth 自有的 Agent Capability Plugin manifest 索引与状态展示。manifest 在本轮只读:

- 可以被发现、解析、校验, 并在 Settings 中展示状态。
- 不会被加入 active `plugins` 列表。
- 不会执行 manifest 中的命令、脚本、hook、健康检查或扫描逻辑。
- 不会授予第三方 manifest 写入或执行能力。

这与官方 Claude Code / Codex plugin 概念保持边界: Claude Code 有 `.claude-plugin/plugin.json`, Codex 目前没有公开等价的本地 manifest schema。Berth manifest 是本应用用于描述 Agent 能力的配置格式。

## Manifest 格式

文件格式为 JSON object。当前只支持 `schemaVersion: 1`。

```json
{
  "schemaVersion": 1,
  "id": "example-agent",
  "displayName": "Example Agent",
  "version": "0.1.0",
  "agentCompatibility": {
    "agentId": "example-agent",
    "name": "Example Agent",
    "versionRange": ">=1.0.0 <2.0.0"
  },
  "permissions": [
    {
      "kind": "read",
      "scopes": ["user"],
      "pathPatterns": ["~/.example"],
      "reason": "Read local Example Agent configuration."
    }
  ],
  "sourceDescriptors": [],
  "assetDescriptors": [],
  "healthCheckDescriptors": [],
  "hookSchema": {
    "agentId": "example-agent",
    "events": [],
    "handlers": []
  },
  "references": [
    {
      "label": "Official docs",
      "url": "https://example.com/docs"
    }
  ]
}
```

### 字段约束

- `schemaVersion`: 必填 number, 仅接受 `1`。
- `id`: 必填 string, 只接受小写字母、数字、点、下划线和连字符, 不能与内置 plugin id 冲突。
- `displayName`: 必填 string, 非空, 最大 80 字符。
- `version`: 必填 string, 使用简化 semver: `x.y.z` 或 `x.y.z-prerelease`。
- `agentCompatibility`: 必填 object。
  - `agentId`: 必填 string, 同样使用 plugin id 字符集。
  - `name`: 必填 string。
  - `versionRange`: 可选 string, 当前支持 exact version、`*`、`>=x.y.z`、`>x.y.z`、`<=x.y.z`、`<x.y.z`, 以及用空格连接的多个比较器。
- `permissions`: 必填 array, 只能声明 `kind: "read"`。声明 `write` 或 `execute` 在本阶段判为 invalid。
- `sourceDescriptors` / `assetDescriptors` / `healthCheckDescriptors`: 可选 array, 存在时校验基础结构、枚举值和必填字段。
- `hookSchema`: 可选 object, 存在时校验 `agentId`、events、handlers、field descriptors 基础结构。
- `references`: 可选 array, URL 只接受 `https:`。

### 校验策略

校验必须 fail closed:

- JSON 解析失败、根节点不是 object、缺少必填字段、schemaVersion 不兼容、id 冲突、权限越界、URL 非 `https:` 均返回 `invalid`。
- 单个 manifest 失败不影响内置 Claude Code / Codex plugin 返回。
- 同一批 manifest 里 id 重复时, 后出现的条目判为 `invalid`。
- validator 只返回结构化错误, 不抛出会让 IPC 全局失败的异常。

## 数据契约

`src/shared/types/agent-plugin.ts` 新增 manifest 状态类型:

```ts
export type AgentCapabilityPluginManifestStatus =
  | 'valid'
  | 'invalid'
  | 'incompatible'

export interface AgentCapabilityPluginManifestValidationError {
  code: string
  message: string
  field?: string
}

export interface AgentCapabilityPluginManifestEntry {
  path: string
  status: AgentCapabilityPluginManifestStatus
  readonly: true
  id?: string
  displayName?: string
  version?: string
  schemaVersion?: number
  agentCompatibility?: {
    agentId: string
    name: string
    versionRange?: string
    detectedVersion?: string
  }
  errors: AgentCapabilityPluginManifestValidationError[]
}
```

`AgentCapabilityPluginListResult` 改为:

```ts
export interface AgentCapabilityPluginListResult {
  plugins: AgentCapabilityPlugin[]
  manifests: AgentCapabilityPluginManifestEntry[]
}
```

`AgentScanSourceGroup` 新增可选 `version?: string`, 由 `AgentAdapter.detect()` 的 `DetectResult.version` 传递。这样 manifest loader 能根据已检测到的 agent version 判断 `versionRange`。

## 模块结构

- `src/main/agent-plugins/manifest.ts`
  - `loadAgentPluginManifests(options)`
  - `validateAgentPluginManifest(value, context)`
  - `isVersionInRange(version, range)`
  - 发现路径:
    - `~/.berth/agent-plugins/*.json`
    - `<project>/.berth/agent-plugins/*.json`
    - `BERTH_AGENT_PLUGIN_MANIFESTS`, 按 `path.delimiter` 拆分
- `src/main/agent-plugins/registry.ts`
  - 保持内置 plugin 构建逻辑。
  - `listAgentCapabilityPlugins(groups, options?)` 合并 manifest 状态, 但只把内置 Claude Code / Codex 放进 `plugins`。
- `src/main/ipc/handlers.ts`
  - `agent-plugins:list` 传入 `projectDir` 和 `homeDir`。
- `src/main/engine/scanner.ts`
  - `getScanSourceGroups()` 带上 detect version。
- `src/renderer/src/hooks/use-ipc.ts`
  - hook 返回 `plugins` 和 `manifests`。
  - IPC 全局错误时仍为空列表; manifest 局部错误由 `manifests` 承载。
- `src/renderer/src/components/settings/agent-capability-plugins-section.tsx`
  - 同一 Settings 区块内追加 manifest rows。
  - 默认只展示摘要: 名称/id、版本、状态、目标 agent、只读。
  - 展开后展示 path、versionRange、错误列表。

## 界面质量与交互验收

- 布局层级: manifest rows 仍在 Agent Capability Plugins 区块内, 不新增大卡片或整页说明。
- 信息密度: 默认状态不展开错误详情; 一行能读出 valid / invalid / incompatible。
- 组件选择: 使用现有折叠行、badge、详情区样式, 不新增新的视觉体系。
- 颜色与状态: valid 使用普通强 badge; invalid / incompatible 使用 muted 行和短状态 badge, 不做高噪声警报卡。
- 交互反馈: 鼠标 hover 保持当前按钮反馈; 点击整行展开; `aria-expanded` 正确。
- 加载/空/错误: manifest 列表为空时不展示空态; 全局 IPC error 保持原提示; invalid manifest 不清空内置 plugins。
- 禁用/focus: incompatible 行视觉上弱化, 但仍可聚焦和展开查看原因。
- 键盘可达性: manifest row 使用 button, 可通过键盘展开。
- 响应式: 长路径 `truncate` 并保留 `title`; 小屏下摘要换行, 不溢出。
- 文案/i18n: 新增 en/zh key, UI 直接显示 manifest `displayName` 和结构化错误消息。
- 截图或交互验收: verify 阶段在 Settings 页面实测 valid / invalid / incompatible 展示, 至少保留一张 Electron 截图。

## 测试矩阵

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 自动化说明 |
|---|---|---|---|---|
| manifest JSON parser 解析有效 JSON | unit | `tests/unit/agent-plugin-manifest.test.ts` | `pnpm test -- tests/unit/agent-plugin-manifest.test.ts` | 必须覆盖 |
| 缺少必填字段 / schemaVersion 错误 / id 冲突 / 非 https reference | unit | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 必须覆盖 |
| write / execute permission 在本阶段 fail closed | unit | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 必须覆盖 |
| versionRange 与 detectedVersion 匹配 / 不匹配 / 未检测 | unit | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 必须覆盖 |
| registry 保持内置 plugins, 并返回 manifests | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm test -- tests/unit/agent-capability-plugins.test.ts` | 必须覆盖 |
| scan source group 传递 detect version | unit | `tests/unit/agent-capability-plugins.test.ts` 或新 scanner unit | 目标测试 | 如现有测试难以隔离, 通过 registry input 覆盖 |
| Settings 默认展示 manifest 摘要 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm test -- tests/renderer/settings-agent-plugins.test.tsx` | 必须覆盖 |
| Settings 展开展示 path/errors/versionRange | renderer | 同上 | 同上 | 必须覆盖 |
| invalid manifest 不清空内置 plugin | renderer | 同上 | 同上 | 必须覆盖 |
| 类型与 IPC 契约 | typecheck | n/a | `pnpm typecheck` | 必须覆盖 |
| 任务态合规 | harness | n/a | `pnpm harness:check --work docs/works/2026-06-02-gh-29-agent-plugin-manifest-version-compatibility` | 必须覆盖 |

## 验收回指

- 回指 01-ANALYSIS 验收 1: `agent-plugins:list` 返回 `plugins` + `manifests`。
- 回指 01-ANALYSIS 验收 2-4: parser / validator 覆盖基础字段、错误状态、兼容状态。
- 回指 01-ANALYSIS 验收 5: Settings 展示 manifest 状态并支持展开详情。
- 回指 01-ANALYSIS 验收 6: 内置 plugin 行为和现有 tests 保持。
- 回指 01-ANALYSIS 验收 7: 第三方 manifest 只读, 不执行代码。
- 回指 01-ANALYSIS 验收 8: 目标测试、typecheck、harness 检查通过。

# Spec: Agent Capability Plugin source descriptors

## 数据契约

在 `src/shared/types/agent-plugin.ts` 新增:

```ts
export interface AgentCapabilityPluginSourceDescriptor {
  code: ScanSourceCode
  scope: AssetScope
  kind: ScanSourceKind
  categories: AssetCategory[]
  pathPattern: string
  labelKey: string
  descriptionKey: string
}
```

`AgentCapabilityPlugin` 新增:

```ts
sourceDescriptors: AgentCapabilityPluginSourceDescriptor[]
```

运行时来源项扩展为:

```ts
export interface AgentCapabilityPluginSource {
  ...
  declared?: boolean
  labelKey?: string
  descriptionKey?: string
  pathPattern?: string
}
```

含义:

- `sourceDescriptors`: 插件声明的理论来源能力, 不表达本机是否存在。
- `sourceCoverage.sources`: scanner 返回的实际状态; 若 `code` 命中 descriptor, registry 补充 `declared: true` 和 descriptor 文案 key; 若没有命中, 保留原始来源并标记 `declared: false`。
- `project.current-candidate` / `project.session-derived-candidate`: scanner 通用候选, 允许作为 `declared: false` 来源存在。

对应验收: A1, A2, A3。

## 模块结构

- `src/main/agent-plugins/registry.ts`
  - 定义 Claude Code / Codex 内置 `sourceDescriptors`。
  - `buildSourceCoverage(group, descriptors)` 使用 `code` 做窄匹配。
  - registry 继续不执行 Agent 命令, 权限不新增 execute。
- `src/shared/types/agent-plugin.ts`
  - 扩展共享类型, 供 main/preload/renderer/test 共用。
- `tests/unit/agent-capability-plugins.test.ts`
  - 校验内置 descriptor code 清单。
  - 校验 coverage 中 agent-specific 来源被标记为 declared, scanner 通用项目候选被保留为 undeclared。
- `tests/renderer/settings-agent-plugins.test.tsx`
  - 测试 fixture 补齐 `sourceDescriptors: []`, 保持 UI 测试聚焦现有渲染。

## 设计取舍

- 不把 adapter 迁移成由 descriptor 驱动。当前 adapter 还承担路径发现、环境变量、存在性判断和不同状态输出, 一次迁移会扩大风险。
- 不把 `project.*` 写入 Claude/Codex descriptor。它们是 scanner 对项目候选的运行时解释, 不是 Agent 官方来源。
- 不新增 Settings 默认展示。用户已经明确偏好减少平铺说明, descriptor 先作为数据能力进入 IPC。

## 测试矩阵

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 说明 |
|---|---|---|---|---|
| 内置插件暴露 Claude/Codex source descriptors | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm exec vitest run tests/unit/agent-capability-plugins.test.ts` | 覆盖 A1/A2 |
| coverage 与 descriptor 按 code 对齐 | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm exec vitest run tests/unit/agent-capability-plugins.test.ts` | 覆盖 A3 |
| Settings 插件列表继续渲染 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx` | 覆盖 A4 |
| 任务态与文档合规 | harness | docs works/issues | `pnpm harness:check --work docs/works/2026-06-02-gh-24-agent-plugin-source-descriptors` | 覆盖流程合规 |

## 界面质量与交互验收

- 默认列表仍只显示插件概要、检测状态、能力数量和来源计数。
- 展开详情仍用当前轻量行布局展示权限、来源、能力和引用。
- 新增 descriptor 不进入默认可见区; 不增加 card 嵌套或大段解释。
- Renderer 测试保证展开交互和文案没有被新增字段破坏。此任务没有 CSS / layout 改动, 不需要新增截图验收。

# Spec: Agent Capability Plugin asset descriptors

## 数据契约

在 `src/shared/types/agent-plugin.ts` 新增:

```ts
export interface AgentCapabilityPluginAssetDescriptor {
  type: AssetType
  category: AssetCategory
  scopes: AssetScope[]
  sourceCodes?: ScanSourceCode[]
  sensitive?: boolean
  labelKey: string
  descriptionKey: string
}
```

`AgentCapabilityPlugin` 新增:

```ts
assetDescriptors: AgentCapabilityPluginAssetDescriptor[]
```

含义:

- `assetDescriptors` 描述插件当前能解析出的顶层资产类型。
- `sourceCodes` 是辅助关系, 表示这个 asset 通常来自哪些 source descriptors; 不要求覆盖 project candidate 这类 scanner 通用来源。
- `sensitive` 标记该类型需要 UI 保持内容脱敏或只展示存在性。

对应验收: A1, A2, A3。

## 模块结构

- `src/shared/types/agent-plugin.ts`
  - 扩展共享 plugin 类型。
- `src/main/agent-plugins/registry.ts`
  - 定义 `CLAUDE_ASSET_DESCRIPTORS` 和 `CODEX_ASSET_DESCRIPTORS`。
  - 不把预留 `AssetType` 写入 descriptor。
- `tests/unit/agent-capability-plugins.test.ts`
  - 校验 Claude Code / Codex descriptor type 清单。
  - 校验关键元数据: `credential.sensitive`, `session.scopes`, Codex 不声明未产出的 capability 类型。
- `tests/renderer/settings-agent-plugins.test.tsx`
  - fixture 补齐 `assetDescriptors: []`, 确认 Settings 仍可渲染。

## 设计取舍

- 不迁移 parser 执行。adapter 仍是实际扫描与解析入口, registry 先承载能力声明。
- 不直接展示资产 descriptor。用户已明确偏好渐进展示, 本任务避免在默认设置页增加信息量。
- 不声明预留类型。descriptor 代表当前能力, 不是未来愿望清单。

## 测试矩阵

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 说明 |
|---|---|---|---|---|
| 内置插件暴露 asset descriptors | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm exec vitest run tests/unit/agent-capability-plugins.test.ts` | 覆盖 A1/A2/A3 |
| Settings 插件列表继续渲染 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx` | 覆盖 A4 |
| 共享类型无破坏 | typecheck | shared/main/renderer | `pnpm typecheck` | 覆盖 IPC 类型消费 |
| 任务态与 issue 合规 | harness | docs works/issues | `pnpm harness:check --work docs/works/2026-06-02-gh-25-agent-plugin-asset-descriptors` | 覆盖流程合规 |

## 界面质量与交互验收

- 默认插件列表只显示现有概要, 不新增 asset descriptor 平铺列表。
- 展开详情不新增长内容; 后续若展示资产能力, 应使用折叠列表或 hover 说明。
- Renderer 测试保证 Settings 页面仍可加载、展开并打开引用链接。

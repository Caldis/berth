# Polish: Agent Capability Plugin source descriptors

## 任务边界

本任务只处理 Agent Capability Plugin 的 source descriptor 数据契约、内置 Claude Code / Codex descriptor 清单、运行时 coverage 对齐和 Settings 测试 fixture。它不改 Settings 页面布局, 不迁移 adapter 生成逻辑, 不新增第三方插件加载。

## 检查结果

| 项 | 结论 | 当前任务是否处理 |
|---|---|---|
| 正确性 | descriptor 覆盖当前 Claude Code / Codex adapter 的 agent-specific 来源 code; `project.*` 通用候选保留为 runtime coverage | 已处理 |
| UI/UX | 默认 Settings 插件列表没有新增平铺说明; 展开详情继续使用现有轻量结构 | 已处理 |
| 可用性 | descriptor 先进入 IPC 数据, 不强迫用户阅读理论来源清单 | 已处理 |
| 性能 | registry 只做一次 Map join, 数据量很小 | 已处理 |
| 测试 | unit + renderer + lint/typecheck/test 均通过 | 已处理 |

## 候选改进

当前任务内没有必须继续修改的 polish 项。后续若要把 descriptor 展示给用户, 应作为新的 UI 任务处理: 在 Settings 插件详情里用折叠列表或 hover 说明展示理论来源, 不进入默认摘要区。

## 验证记录

- `pnpm lint` passed
- `pnpm typecheck` passed
- `pnpm exec vitest run tests/unit/agent-capability-plugins.test.ts tests/renderer/settings-agent-plugins.test.tsx` passed, 9 tests
- `pnpm test` passed, 53 files, 381 tests
- `pnpm harness:check` passed
- `node scripts/harness-projects.mjs check --strict` passed

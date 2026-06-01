# Polish: Agent Capability Plugin asset descriptors

## 任务边界

本任务只处理 Agent Capability Plugin 的 asset descriptor 数据契约、内置 Claude Code / Codex 资产能力清单、Settings 测试 fixture。它不改 adapter parser 执行逻辑, 不展示资产清单, 不处理 health check descriptors。

## 检查结果

| 项 | 结论 | 当前任务是否处理 |
|---|---|---|
| 正确性 | descriptor 只覆盖当前真实 parser 输出的顶层资产类型, 没有声明预留类型 | 已处理 |
| UI/UX | 默认 Settings 插件列表没有新增资产清单, 展开详情信息密度不变 | 已处理 |
| 可用性 | `credential` 已标记 sensitive, `session` scope 与来源目录 scope 分开 | 已处理 |
| 性能 | registry 只返回静态元数据, 没有增加扫描成本 | 已处理 |
| 测试 | unit + renderer + lint/typecheck/test 均通过 | 已处理 |

## 候选改进

当前任务内没有必须继续修改的 polish 项。后续若展示 asset descriptors, 应做成 Settings 插件详情中的折叠能力表, 并在文案上区分 Claude Code 本地 `plugin` asset 和 Berth 的 `Agent Capability Plugin`。

## 验证记录

- `pnpm lint` passed
- `pnpm typecheck` passed
- `pnpm exec vitest run tests/unit/agent-capability-plugins.test.ts tests/renderer/settings-agent-plugins.test.tsx` passed, 11 tests
- `pnpm test` passed, 53 files, 383 tests
- `pnpm harness:check --work docs/works/2026-06-02-gh-25-agent-plugin-asset-descriptors` passed
- `node scripts/harness-projects.mjs check --strict` passed

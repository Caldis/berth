# Polish: Agent Capability Plugin health check descriptors

## 任务边界

本任务只处理 Agent Capability Plugin 的 health check descriptor 数据契约、内置 Claude Code / Codex 规则族清单、Settings 测试 fixture。它不改 `src/main/engine/health.ts` 的执行逻辑, 不改 Overview 健康检查 UI, 不在 Settings 默认摘要里平铺健康规则。

## 检查结果

| 项 | 结论 | 当前任务是否处理 |
|---|---|---|
| 正确性 | descriptor 覆盖当前 agent-specific 健康检查规则族; `all:*` 共享规则仍保留在 runtime health engine | 已处理 |
| UI/UX | 默认 Settings 插件列表没有新增大段说明; 新字段不会改变当前摘要、展开和外链交互 | 已处理 |
| 可用性 | descriptor 保留 rule family id, 具体实例仍由 runtime 生成, 不把用户带到抽象规则清单 | 已处理 |
| i18n | descriptor id 保留冒号; i18n key 将冒号转成点, 避免 i18next namespace 解析问题 | 已处理 |
| 性能 | registry 只返回静态元数据, 没有增加扫描、解析或页面渲染成本 | 已处理 |
| 测试 | unit + renderer + lint/typecheck/test 均通过 | 已处理 |

## 候选改进

当前任务内没有必须继续修改的 polish 项。

后续如果要让用户直接看到这些规则, 应作为新的 Settings UI 任务处理: 在插件详情里用折叠分组展示健康规则覆盖范围, 并为 severity、category、asset type 提供 hover/focus 说明。不要放进默认摘要区, 也不要替代 Overview 里的运行时健康检查结果。

## 验证记录

- `pnpm vitest run tests/unit/agent-capability-plugins.test.ts` passed, 10 tests
- `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` passed, 3 tests
- `pnpm lint` passed
- `pnpm typecheck` passed
- `pnpm test` passed, 53 files, 385 tests
- `pnpm harness:check` passed

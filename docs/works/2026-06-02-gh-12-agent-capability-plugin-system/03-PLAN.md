# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] P1. 新增共享 plugin 类型和主进程 registry
  - 变更: `src/shared/types/agent-plugin.ts`, `src/main/agent-plugins/registry.ts`
  - 验证: `pnpm test -- tests/unit/agent-capability-plugins.test.ts`, `pnpm typecheck:node`
- [ ] P2. 接入只读 IPC / preload / renderer hook
  - 变更: `src/shared/types/ipc.ts`, `src/main/ipc/handlers.ts`, `src/preload/index.ts`, `src/preload/index.d.ts`, `src/renderer/src/hooks/use-ipc.ts`, `tests/setup.ts`
  - 验证: `pnpm typecheck:node`, `pnpm typecheck:web`
- [ ] P3. 新增 Settings 的 Agent Capability Plugins 区块
  - 变更: `src/renderer/src/components/settings/agent-capability-plugins-section.tsx`, `src/renderer/src/pages/settings.tsx`, `src/renderer/src/i18n/locales/{zh,en}.json`
  - 验证: `pnpm test -- tests/renderer/settings-agent-plugins.test.tsx`, `pnpm typecheck:web`
- [ ] P4. 全量相关门禁与视觉检查
  - 验证: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm harness:check`, 设置页截图检查
- [ ] P5. 归档 GH-12 第一阶段
  - 验证: `pnpm harness:check`, `node scripts/harness-projects.mjs check --strict`

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

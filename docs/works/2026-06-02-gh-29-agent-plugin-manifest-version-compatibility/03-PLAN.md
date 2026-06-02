# 实施计划

## 执行顺序

本任务按顺序执行。原因是 shared 类型、主进程 registry、renderer hook 和 Settings UI 都依赖同一份 `AgentCapabilityPluginListResult` 契约, 并行修改同一批文件容易制造不必要冲突。

- [ ] 1. 新增 manifest shared 类型与 parser / validator
  - files: `src/shared/types/agent-plugin.ts`, `src/main/agent-plugins/manifest.ts`, `tests/unit/agent-plugin-manifest.test.ts`
  - tests: `pnpm test -- tests/unit/agent-plugin-manifest.test.ts`
  - verify: 有效 manifest、JSON 错误、schemaVersion 错误、id 冲突、write/execute 权限、非 https reference、versionRange 匹配/不匹配均被覆盖。

- [ ] 2. 接入 registry、IPC 和 detected version
  - files: `src/shared/types/ipc.ts`, `src/main/engine/scanner.ts`, `src/main/agent-plugins/registry.ts`, `src/main/ipc/handlers.ts`, `tests/unit/agent-capability-plugins.test.ts`
  - tests: `pnpm test -- tests/unit/agent-capability-plugins.test.ts`
  - verify: `listAgentCapabilityPlugins()` 仍返回 Claude Code / Codex 两个内置 plugins; 同时返回 manifest status; invalid manifest 不影响内置 plugins; `AgentScanSourceGroup.version` 能参与兼容判断。

- [ ] 3. 接入 renderer hook 和 Settings manifest 展示
  - files: `src/renderer/src/hooks/use-ipc.ts`, `src/renderer/src/components/settings/agent-capability-plugins-section.tsx`, `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`, `tests/renderer/settings-agent-plugins.test.tsx`
  - tests: `pnpm test -- tests/renderer/settings-agent-plugins.test.tsx`
  - verify: manifest 默认摘要低噪声展示; valid / invalid / incompatible badge 清楚; 展开后能看 path、versionRange、错误列表; 键盘可达; 长路径截断并有 title; 内置 plugin 不被 invalid manifest 清空。

- [ ] 4. 跑目标门禁并修正回归
  - files: 按测试结果限定到本任务已修改文件。
  - tests: `pnpm typecheck`, `pnpm harness:check --work docs/works/2026-06-02-gh-29-agent-plugin-manifest-version-compatibility`
  - verify: 类型、IPC 契约和任务态均通过; 若出现与当前任务无关的全局失败, 记录原因并保留目标测试证据。

- [ ] 5. 实测 Settings 页面
  - files: 如发现 UI 问题, 只修改 Settings 相关文件。
  - tests: Electron 设置页截图 / 交互验证。
  - verify: valid / invalid / incompatible 三种 manifest 行在页面内可读, 不挤压内置 plugin 区块, hover/focus/展开状态正常。

## 提交策略

- 每完成一个上面的独立步骤并通过对应验证, 立即显式暂存本步骤文件。
- 提交前运行 `git diff --cached` 核对 staged 集合。
- 提交成功后立即 `git push` 推送当前分支。

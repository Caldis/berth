# 任务清单 (Design 产物 / 活清单)

- [x] 扩展 manifest readiness 类型与测试 fixture。
  - files: `src/shared/types/agent-plugin.ts`, `tests/unit/agent-plugin-manifest.test.ts`
  - tests: `pnpm test -- tests/unit/agent-plugin-manifest.test.ts`
  - verify: read-only、implementation、write/execute、incompatible、invalid 状态都有断言。2026-06-02 通过 `pnpm test -- tests/unit/agent-plugin-manifest.test.ts tests/unit/agent-capability-plugins.test.ts`。

- [x] 实现主进程 manifest readiness 计算。
  - files: `src/main/agent-plugins/manifest.ts`, `tests/unit/agent-plugin-manifest.test.ts`, `tests/unit/agent-capability-plugins.test.ts`
  - tests: `pnpm test -- tests/unit/agent-plugin-manifest.test.ts tests/unit/agent-capability-plugins.test.ts`
  - verify: `write` / `execute` 不再作为 validation error; duplicate manifest id 同步变成 readiness invalid; built-in plugin 列表不变。2026-06-02 通过目标测试。

- [x] 更新 Settings 插件列表与详情展示。
  - files: `src/renderer/src/components/settings/agent-capability-plugins-section.tsx`, `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`, `tests/renderer/settings-agent-plugins.test.tsx`
  - tests: `pnpm test -- tests/renderer/settings-agent-plugins.test.tsx`
  - verify: 列表只显示短 readiness 标签; 展开详情展示原因、implementation、blocked permissions; 关键说明不是 hover-only; 中英文 key 都存在。2026-06-02 通过渲染测试和 `pnpm typecheck`。

- [x] 运行实现阶段检查并转入 verify。
  - files: `docs/works/2026-06-02-gh-30-agent-plugin-activation-readiness/INDEX.md`, `docs/works/2026-06-02-gh-30-agent-plugin-activation-readiness/03-PLAN.md`
  - tests: `pnpm typecheck`; `pnpm test -- tests/unit/agent-plugin-manifest.test.ts tests/unit/agent-capability-plugins.test.ts tests/renderer/settings-agent-plugins.test.tsx`; `pnpm harness:check --work docs/works/2026-06-02-gh-30-agent-plugin-activation-readiness`
  - verify: 2026-06-02 以上命令全部通过, `INDEX.phase` 改为 `verify`。

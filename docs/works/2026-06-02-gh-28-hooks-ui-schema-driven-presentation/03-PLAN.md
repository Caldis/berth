# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。implement 阶段维护此清单。

- [ ] 任务 1: 扩展 `hook-lifecycle.ts` 纯函数, 支持可选 plugin hook schema 驱动 event/stage/support, 并保留 fallback。
  - tests: `pnpm vitest run tests/unit/hook-lifecycle.test.ts`
  - verify: stage title/summary/recommendation 仍来自 Berth 静态壳; schema event 能进入指定 stage; 未声明 event 仍进入 unknown; Codex environment 在 schema 缺失时仍隐藏。
- [ ] 任务 2: Hooks 行级展示读取 handler schema 的 primary fields、runMode 和 support note。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `command`、`http`、`mcp_tool`、`prompt`、`commandWindows` 常见字段展示正确; Codex `prompt` / `agent` 显示 parsed-only; raw JSON、copy、toggle、recovery、health hover 行为不变; 长文本不横向撑开。
- [ ] 任务 3: Capabilities Hooks tab 接入 `useAgentCapabilityPlugins()` 并传入 Hooks 视图。
  - tests: `pnpm vitest run tests/renderer/capabilities-guidance.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: plugin list 加载失败或为空时 Hooks 仍使用 fallback; schema 存在时页面级渲染能展示 schema-driven 主字段; Settings 插件页不受影响。
- [ ] 任务 4: 补齐 i18n 短文案并进入 verify 前检查。
  - tests: `pnpm typecheck`; `pnpm harness:check --work docs/works/2026-06-02-gh-28-hooks-ui-schema-driven-presentation`
  - verify: 新增文案不裸露 key; 当前 work 产物合规。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

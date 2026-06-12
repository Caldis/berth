# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] 任务 1: 给 renderer asset store 补 stale 保持测试
  - tests: `pnpm vitest run tests/renderer/app-store.test.ts`
  - verify: committed snapshot 下 scanning partial/snapshot 不改变内容区数据; initial/no snapshot 下 partial 仍可填首屏; final snapshot 与 ready 增量仍更新。
- [ ] 任务 2: 实现 renderer asset store 的 scanning stale 保持
  - tests: `pnpm vitest run tests/renderer/app-store.test.ts`
  - verify: 页面主要内容在后台扫描时保持旧数据; 不新增 UI 组件、样式或文案。
- [ ] 任务 3: 给 watcher fallback scheduled refresh 补测试
  - tests: `pnpm vitest run tests/unit/watch-wiring.test.ts tests/unit/agent-asset-runtime.test.ts`
  - verify: unsupported watcher event 合并到 `scheduleRefresh`; 老 runtime fallback 不破坏现有契约; 不涉及 UI。
- [ ] 任务 4: 实现 watcher fallback 合并与最小间隔
  - tests: `pnpm vitest run tests/unit/watch-wiring.test.ts tests/unit/agent-asset-runtime.test.ts`
  - verify: 高频 session change 不会对每个事件立即 full refresh; 手动刷新不被限频。
- [ ] 任务 5: 集成验证与真实 Electron 时序观察
  - tests: `pnpm vitest run tests/renderer/app-store.test.ts tests/unit/watch-wiring.test.ts tests/unit/agent-asset-runtime.test.ts`, `pnpm typecheck:web`, `pnpm typecheck:node`, `pnpm harness:check --work docs/works/2026-06-13-gh-129-stabilize-scan-refresh-ui`
  - verify: 用 dev agent 启动真实窗口, 通过 CDP 观察至少 30s, 状态可进入扫描但内容区不闪空、不变成扫描子集。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

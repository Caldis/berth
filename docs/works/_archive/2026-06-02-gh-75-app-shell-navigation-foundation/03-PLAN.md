# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 扩展 window always-on-top IPC 与 pin 控制按钮。
  - tests: `pnpm test tests/renderer/window-controls.test.tsx`; `pnpm typecheck:web`; `pnpm typecheck:node`
  - verify: pin 按钮有 `aria-pressed`, en/zh label 正确, 点击调用 preload API。
- [x] 任务 2: 增加 sidebar width 状态、resize handle 与折叠后的主体宽度计算。
  - tests: `pnpm test tests/renderer/sidebar-agent-view.test.tsx`; `pnpm typecheck:web`
  - verify: expanded/collapsed width 稳定, resize clamp 生效, drag/no-drag 区域不影响导航按钮。
- [x] 任务 3: 增加顶部导航栏和路由面包屑。
  - tests: `pnpm test tests/renderer/top-navigation.test.tsx`; `pnpm typecheck:web`
  - verify: `/`, `/sessions`, `/sessions/:id`, `/configuration/instructions`, `/configuration/capabilities`, `/usage` 面包屑正确。
- [x] 任务 4: e2e 覆盖 app shell 与 Windows controls。
  - tests: `pnpm build`; `pnpm test:e2e tests/e2e/app.e2e.ts`; `pnpm test:e2e tests/e2e/window-controls.e2e.ts`
  - verify: sidebar 可见、可折叠、可拖曳; top nav 可见; window controls 稳定; Windows 下 pin 状态可切换。
- [x] 任务 5: 收口验证、关联本地 issue 与推送前门禁。
  - tests: `pnpm harness:prepush`
  - verify: `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`; CI wait 成功。
  - evidence: `pnpm harness:prepush`; `pnpm test:e2e tests/e2e/app.e2e.ts`; `pnpm test:e2e tests/e2e/window-controls.e2e.ts`; `pnpm dev:agent screenshot gh75-shell-verify --mode print-window`; `pnpm harness:ci:wait -- --sha 818c47c1c0f19af1a983f6e37395f733dda0c49a`; `node scripts/harness-projects.mjs done docs/works/2026-06-02-gh-75-app-shell-navigation-foundation`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

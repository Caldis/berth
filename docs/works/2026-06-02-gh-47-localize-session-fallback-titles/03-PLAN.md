# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 完成 explore/design 产物
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-47-localize-session-fallback-titles`
  - verify: 2026-06-02 已确认三个硬编码渲染点, 方案限定为 locale key + 三处替换 + renderer 测试
- [x] 任务 2: 更新 session fallback 标题 i18n
  - tests: `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx`
  - verify: 2026-06-02 先用 `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx -t "localizes fallback titles"` 复现失败; 添加 `sessions.fallbackTitle` 后同一测试通过; 完整 `tests/renderer/sessions-pages.test.tsx` 通过, 17 tests passed; 页面代码中已无硬编码 `Session #`
- [x] 任务 3: 收口检查
  - tests: `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-47-localize-session-fallback-titles`
  - verify: 2026-06-02 `pnpm lint` 通过; `pnpm typecheck:web` 通过; `pnpm harness:check --work docs/works/2026-06-02-gh-47-localize-session-fallback-titles` 通过; `pnpm test` 通过, 57 files / 437 tests

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

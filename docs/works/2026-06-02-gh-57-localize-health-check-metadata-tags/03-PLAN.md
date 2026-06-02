# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 在 health-check i18n helper 中增加 scope / confidence / asset type 标签本地化, 并补充 en/zh 文案。
  - tests: `pnpm vitest run tests/renderer/overview-health-checks.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx` — 25 passed
  - verify: 中文 tag 不再显示 raw 英文枚举; 未知值 fallback 原值。
- [x] 任务 2: 接入 Overview 与 Hooks 生命周期 hover 详情。
  - tests: `pnpm vitest run tests/renderer/overview-health-checks.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx` — 25 passed
  - verify: 页面密度不变, hover 详情可读。
- [ ] 任务 3: 完成目标检查与界面截图验证。
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 本地检查通过, push 前确认当前分支最近 GitHub Actions 非当前会话红灯, push 后等待新 SHA CI。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 添加/更新 Overview renderer 测试, 锁定新信息结构、范围展示、能力入口新路由、loading/empty/unknown cost 状态。
  - tests: `pnpm test tests/renderer/overview-redesign.test.tsx tests/renderer/overview-health-checks.test.tsx tests/renderer/sessions-pages.test.tsx` — 3 files / 28 tests passed。
  - verify: 覆盖当前 agent / project scope、快捷入口新路由、健康 loading/empty、最近会话空态和未知费用空态。
- [x] 任务 2: 重构 `src/renderer/src/pages/overview.tsx`, 保留现有数据契约和健康检查动作, 实现 hero、能力入口、最近会话、用量摘要、健康待处理面板。
  - tests: 同任务 1; `pnpm typecheck:web` passed。
  - verify: 健康检查点击、复制、忽略、证据链接继续由 `overview-health-checks.test.tsx` 覆盖; 快捷入口不再依赖旧 `/configuration/*` 路径。
- [x] 任务 3: 补齐 `overview.*` 中英文文案, 更新受影响 renderer/e2e 测试。
  - tests: 同任务 1; `pnpm build` passed; `pnpm test:e2e tests/e2e/app.e2e.ts` — 14 tests passed。
  - verify: e2e 默认首页检查 hero、quick actions 和健康检查标题; renderer 中文用例确认不显示 raw enum 或英文 fallback。
- [x] 任务 4: 做本地界面验收和提交前检查。
  - tests: `pnpm harness:check` passed; `pnpm harness:prepush` passed; `pnpm build` passed; `pnpm test:e2e tests/e2e/app.e2e.ts` passed。
  - verify: Electron/CDP 实测首页 hero、快捷入口、最近会话、健康检查标题可见; 截图 `C:\Users\mail\AppData\Local\Temp\berth-gh82-overview.png`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

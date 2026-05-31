# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 扩展工具事件耗时契约与 Codex parser, 先补 parser 测试, verify: `pnpm test -- tests/unit/codex-session-parser.test.ts`。
- [ ] 任务 2: 扩展 token display 的去重展示能力, 先补 renderer 断言, verify: `pnpm test -- tests/renderer/sessions-pages.test.tsx`。
- [ ] 任务 3: 重排会话详情页并补 session signals / 时间线耗时 UI, verify: `pnpm test -- tests/renderer/sessions-pages.test.tsx`。
- [ ] 任务 4: 更新 i18n 与任务态, verify: `pnpm typecheck:web` 和 `pnpm harness:check`。
- [ ] 任务 5: 进入 verify 阶段做最终检查和视觉验收, verify: 记录目标测试、typecheck、harness、UI 验收结果。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

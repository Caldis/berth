# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 更新 conventions 路径展示测试。
  - tests: `tests/renderer/instructions-guidance.test.tsx`
  - verify: `pnpm test -- tests/renderer/instructions-guidance.test.tsx`; 断言完整长路径出现, `D:\...\project\CLAUDE.md` 和 `D:/.../project/CLAUDE.md` 不出现, 路径元素不再带 `truncate`。
  - evidence: 2026-06-13 `pnpm test -- tests\renderer\instructions-guidance.test.tsx` 通过, 7 tests passed。
- [x] 任务 2: 修改 conventions 卡片折叠态路径展示。
  - tests: `tests/renderer/instructions-guidance.test.tsx`
  - verify: `pnpm test -- tests/renderer/instructions-guidance.test.tsx`; 界面质量项为完整路径可换行、不横向溢出、卡片结构不变。
  - evidence: 2026-06-13 `pnpm test -- tests\renderer\instructions-guidance.test.tsx` 通过, 7 tests passed。
- [ ] 任务 3: 阶段门禁与真实界面验收。
  - tests: `pnpm typecheck:web`; `pnpm typecheck:test`; `pnpm harness:check --work docs/works/2026-06-13-gh-128-show-full-instruction-paths`
  - verify: agent-owned Electron 进入约定页截图确认完整路径可读; 只暂存本任务相关文件提交并推送。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

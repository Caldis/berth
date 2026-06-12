# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 给 `truncatePath()` 写分隔符行为测试。
  - tests: `tests/unit/utils.test.ts`
  - verify: `pnpm test -- tests/unit/utils.test.ts` 通过; 覆盖 Windows backslash、Windows forward slash drive、POSIX、UNC path。
- [x] 任务 2: 修复 `truncatePath()` 的截断拼接逻辑。
  - tests: `tests/unit/utils.test.ts`
  - verify: `pnpm test -- tests/unit/utils.test.ts` 通过; UI 验收项为路径格式, 不改布局。
- [x] 任务 3: 覆盖 instructions conventions 卡片折叠/展开路径一致性。
  - tests: `tests/renderer/instructions-guidance.test.tsx`
  - verify: `pnpm test -- tests/renderer/instructions-guidance.test.tsx` 通过; 验收列表短路径和详情完整路径同为 Windows 反斜杠风格。
- [x] 任务 4: 阶段门禁与提交。
  - tests: `pnpm typecheck:web`; `pnpm typecheck:test`; `pnpm harness:check --work docs/works/2026-06-13-gh-127-mixed-slash-path-rendering`
  - verify: `pnpm typecheck:web`、`pnpm typecheck:test`、`pnpm harness:check --work docs/works/2026-06-13-gh-127-mixed-slash-path-rendering` 通过; 只暂存本任务相关文件, `git diff --cached` 核对后提交; 推送后由旁路异步看 CI。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

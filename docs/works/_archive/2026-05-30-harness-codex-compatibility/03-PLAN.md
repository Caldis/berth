# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 修改 `scripts/harness-sync.mjs` / `scripts/harness-lib.mjs`, 移除 `.codex/skills` 分发并归一化文本 / frontmatter 换行处理。
- [x] 任务 2: 修改 `tests/harness/sync.test.ts`, 接受 symlink 与复制目录两种合法 skill 分发。
- [x] 任务 3: 更新 `AGENTS.md`, `.agents/README.md`, `.agents/references/*`, harness 设计文档中的 Codex/Claude 入口说明。
- [x] 任务 4: 更新 CI matrix, 覆盖 Linux 与 Windows harness 校验。
- [x] 任务 5: 运行 `pnpm vitest run tests/harness`, `pnpm harness:check`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`。
- [x] 任务 6: 补 `@eslint/js` 直接 devDependency, 修复 ESLint flat config 运行时缺包。

## 验证记录

- `pnpm install --frozen-lockfile --ignore-scripts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm vitest run tests/harness`
- `pnpm harness:check`
- `pnpm build`

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

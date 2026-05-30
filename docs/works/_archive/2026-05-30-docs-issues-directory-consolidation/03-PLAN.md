# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 将原根目录产品 issue 清单迁移为 `docs/issues/`。verify: `Test-Path docs/issues/AGENTS.md` 为 true, 根同名目录不存在。
- [x] 任务 2: 更新 harness 相关说明和历史交叉引用。verify: `rg` 不再命中旧本地路径。
- [x] 任务 3: 增加 `docs/issues/` 校验和单测。verify: `pnpm test tests/harness/check.test.ts` 通过。
- [x] 任务 4: 跑完整 harness 门禁和观测。verify: `pnpm harness:check`、`pnpm harness:stats` 通过。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

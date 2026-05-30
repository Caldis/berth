# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 更新 `AGENTS.md` 与 `.agents/README.md` 的小改动豁免入口规则。verify: 两处均包含稳定规则句。
- [x] 任务 2: 更新 `.agents/workflow/_shared.md` 的共享契约。verify: 不变量包含豁免沟通要求。
- [x] 任务 3: 为 `harness-check` 增加入口规则一致性检查和单测。verify: `pnpm test tests/harness/check.test.ts` 通过。
- [x] 任务 4: 消费并归档本次 friction。verify: active friction 不再包含该文件, `_archive` 中保留记录。
- [x] 任务 5: 跑完整验证。verify: `pnpm harness:check` 与 `pnpm test` 通过。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

# 需求分析 (Explore 产物)

## 现状理解
本任务不涉及 Berth Electron 运行时 IPC, 影响范围是 harness 流程、脚本门禁、测试配置与 agent 执行规则。

当前主流程耗时来源:
- `pnpm harness:prepush` 串行执行 `lint -> typecheck -> test -> harness:check -> harness:ci:baseline`。
- `pnpm test` 使用单一 `jsdom` 环境覆盖 `tests/unit`、`tests/harness`、`tests/renderer` 全量测试。
- `node scripts/harness-projects.mjs ensure/check/done` 通过 GitHub CLI 访问 Project API, 是网络任务。
- `pnpm harness:ci:wait` 调用 `gh run watch --exit-status`, 是推送后的远端等待任务。
- 任务态文档、issue 绑定、UI 类 Electron 实测仍是主 Agent 需要直接处理的工作。

## 关联与依赖
- `.agents/workflow/_shared.md`: 定义提交、推送、CI 等待、Project 同步与子代理并行规则。
- `.agents/workflow/0.0-new.md`: 创建 Issue、work 目录、Project item 并回写真实 `PVTI_...`。
- `.agents/workflow/4.0-verify.md`: 验证阶段检查本地门禁、Project strict、推送后 CI。
- `.agents/workflow/5.0-archive.md`: archive 前必须把 Project item 置 Done 并回读确认。
- `scripts/harness-ci-gate.mjs`: baseline / wait 两个入口, wait 当前为阻塞式。
- `scripts/harness-projects.mjs`: fields ensure、ensure、done、check 都是同步 CLI 调用。
- `vitest.config.ts`: 当前把全部测试置于 `jsdom`, setup 文件也只按 renderer 需求设计。

子代理探索结论:
- 可由子代理/异步任务承担: `fields ensure` 字段准备、`projects check --strict` 只读审计、CI run 长等待。
- 可交给子代理但主流程必须消费结果: `projects ensure`、`projects done`、`ci wait`。
- 必须阻塞阶段门禁: 创建任务进入 explore 前的真实 `gh_project.item_id`, archive 移目录前的 Done 回读, 任务完成声明前的 CI success。
- 不能被异步放过: 缺 Project 授权、无 `PVTI_...`、archive item 未 Done、CI failure。

## 任务分类与 debt 校准
- type / maintenance.subtype: `maintenance / tooling-ci`
- source.kind / refs: `user-request`
- debt estimate 修正: 暂不修正, `net=-5`
- scope / risk / areas / confidence: `global / medium / tooling-ci,testability / medium`
- revision: 无

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 流程规则明确: Project 与 CI 等非本地长等待可由子代理执行, 但阶段门禁必须消费成功结果。
2. 规则明确保留主 Agent 职责: 任务态写作、阶段产物、UI 实测与失败修复不能完全外包。
3. `prepush` 耗时有可复现证据, 并明确 Vitest 的主要耗时来自 renderer/jsdom。
4. Vitest 配置降低非 renderer 测试的 jsdom 成本, 不改变测试覆盖范围。
5. 新增或修改的 harness/test 配置有自动化测试或命令证据。

## 界面质量与交互验收
不适用。该任务不修改 Berth UI。

## 本地耗时证据
- `pnpm test -- --reporter=verbose`: `83` files / `597` tests passed, duration `13.06s`; cumulative transform `3.31s`, setup `9.85s`, collect `16.85s`, tests `11.55s`, environment `49.42s`, prepare `6.09s`。
- `/usr/bin/time -p pnpm lint`: `real 3.51s`。
- `/usr/bin/time -p pnpm typecheck`: `real 2.81s`。
- `/usr/bin/time -p pnpm harness:check`: `real 0.36s`。
- `/usr/bin/time -p pnpm harness:ci:baseline`: `real 2.06s`。

Vitest JSON 报告分组:
- `tests/renderer`: `41` files, file runtime sum `11682.94ms`。
- `tests/unit`: `36` files, file runtime sum `689.05ms`。
- `tests/harness`: `6` files, file runtime sum `359.74ms`。

最慢测试文件:
- `tests/renderer/hooks-lifecycle-view.test.tsx`: `2395.69ms`
- `tests/renderer/sessions-pages.test.tsx`: `1761.61ms`
- `tests/renderer/search-dialog.test.tsx`: `931.81ms`
- `tests/renderer/settings-agent-plugins.test.tsx`: `667.52ms`

## 未决问题
留给 design 向人澄清。
- 无。用户已明确 Project/CI 等非本地任务希望使用子代理, 任务态写作与 UI 实测仍由主 Agent 完成。

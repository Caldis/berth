# 03-PLAN — 活任务清单

## 实现项 (每项先写/更新测试, 跑通才勾)

- [ ] `en.json` + `zh.json` 新建 `sources.*` (code 22+2 / status / statusCount), 逐字照搬 `EN/ZH_SOURCE_COPY` + 内联双语原文 (**missing ZH=未发现**)
  - test: 新增 zh 锁定断言 (`sources.status.missing===未发现` + 一个 code title 原文 en/zh)
- [ ] `local-source-copy.ts`: 3 函数改吃 `t()` (getScanSourceCopy 三次取值 / statusLabel / countformat), 删 `EN/ZH_SOURCE_COPY` 两字典
  - test: `project-scope-switcher.test.tsx` (en) 保持绿 = 渲染不变
- [ ] `project-scope-switcher.tsx`: L375/452/503 改传 `t`
  - test: `typecheck:web` 通过 (签名同步) + 上述 en 回归
- [ ] 删 9 死键 (en+zh, 复数对称)
  - test: `i18n-plural-convention.test.ts` 绿 (对称护栏) + 全量 test 无 missingKey
- [ ] docs/issues 状态更新 (renderer-dir-semantics 字典项 DONE + gh115-residuals 第2项 DONE; agentPluginSources 第二份平行字典记后续)

## 验收
`pnpm test` + `pnpm typecheck` + `pnpm lint` 全绿; en 渲染逐字不变 + zh 文案锁定。

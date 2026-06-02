# 需求分析 (Explore 产物)

## 现状理解
`scripts/harness-ci-gate.mjs` 的 wait 流程:
1. 解析 `--sha`。
2. `gh run list --branch <branch> --commit <sha>` 拉取 run。
3. `findWorkflowRunForSha` 用 `headSha === sha` 精确匹配。

GitHub run 的 `headSha` 是完整 SHA。用户和 Agent 常用 7 位短 SHA 引用提交, 因此第 3 步会误判。

## 关联与依赖
- `ghRunListArgs` 保持不变, 继续把 `--commit` 传给 `gh`。
- 只改变本地 run 匹配逻辑和测试。
- 不改变 baseline gate。

## 验收标准
1. `findWorkflowRunForSha` 能用完整 SHA 匹配 run。
2. `findWorkflowRunForSha` 能用短 SHA 匹配完整 `headSha`。
3. 不匹配的短 SHA 仍返回 null。
4. `findRunForShaWithRetry` 使用短 SHA 时能返回完整 SHA run, 不再误报。

## 界面质量与交互验收
不适用。

## 未决问题
无。

# BUG 快照 (只读)

来源: GitHub Issue #49, 由 GitHub Actions run 26803101192 触发。

## 复现步骤

1. 在 master 推送提交 `507d20dec01dce2d7e0846ab6108a4055b3f63c8`。
2. GitHub Actions Windows job 执行 `pnpm test`。
3. `tests/renderer/sessions-pages.test.tsx` 中 `renders usage cost details and pricing gaps` 失败。

## 期望 vs 实际

期望: 点击 `Copy override JSON` 后, 测试稳定等待复制反馈按钮显示 `Copied`。

实际: Windows CI 中 `navigator.clipboard.writeText` 已被调用, 但测试同步查询 `Copied` 按钮时 React 状态还未完成提交, 报错:

`Unable to find an accessible element with the role "button" and name "Copied"`

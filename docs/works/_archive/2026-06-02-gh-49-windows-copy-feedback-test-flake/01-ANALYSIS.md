# 需求分析 (Explore 产物)

## 现状理解

失败点在 `tests/renderer/sessions-pages.test.tsx` 的 Usage 页面测试。测试点击 `Copy override JSON` 后, 先用 `waitFor` 等 `writeText` mock 被调用, 随后同步执行 `screen.getByRole('button', { name: 'Copied' })`。

`src/renderer/src/pages/usage.tsx` 的 `copyPricingOverride` 是 async handler: 先 `await navigator.clipboard.writeText(pricingOverrideJson)`, 再 `setPricingOverrideCopied(true)`。因此观察到 clipboard 调用不等于 UI 状态已经提交。Windows CI 的 React 调度更容易暴露这个时间差。

## 关联与依赖

- 相关页面: `src/renderer/src/pages/usage.tsx`
- 相关测试: `tests/renderer/sessions-pages.test.tsx`
- CI 失败: GitHub Actions run 26803101192, Windows job `pnpm test`
- 不需要修改产品交互; 用户真实操作下复制反馈行为合理, 问题在测试等待条件不完整。

## 验收标准

1. 复制覆盖 JSON 后, 测试等待 `Copied` 按钮本身出现, 不依赖 clipboard mock 调用和 React 状态提交的顺序。
2. 目标 renderer 测试通过。
3. 全量本地测试、harness 检查通过; 修复提交 push 后对应 GitHub Actions 通过。

## 界面质量与交互验收

本任务不修改 UI。现有 UI 复制反馈仍为按钮文案从 `Copy override JSON` 变为 `Copied`。

## 未决问题

无。

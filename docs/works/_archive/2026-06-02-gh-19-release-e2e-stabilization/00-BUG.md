# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
GitHub Issue #19: https://github.com/Caldis/berth/issues/19

本任务只处理 #19 中可自主推进的 E2E execution 项。

## 复现步骤
1. 先确保 `pnpm build` 已通过。
2. 运行 `pnpm test:e2e`。
3. 运行 `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0`。

## 期望 vs 实际
期望: Electron E2E 可稳定执行, 窗口控件测试能真实点击最大化/还原按钮并从主进程确认状态变化。

实际: `pnpm test:e2e` 13/14 通过, `tests/e2e/window-controls.e2e.ts` 失败; 单独运行该文件也失败, `BrowserWindow.isMaximized()` 没有变为 `true`。

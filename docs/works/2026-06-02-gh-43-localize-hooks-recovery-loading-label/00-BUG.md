# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
GitHub Issue #43: https://github.com/Caldis/berth/issues/43

## 复现步骤
1. 切换到中文界面。
2. 打开 Hooks 生命周期页, 让恢复中心处于 loading skeleton 状态。
3. 查询 loading skeleton 的 accessible name。

## 期望 vs 实际
期望: loading skeleton 的 aria-label 跟随当前语言。

实际: `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 使用硬编码英文 `aria-label="Loading hook recoveries"`。

# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
GitHub Issue #42: https://github.com/Caldis/berth/issues/42

## 复现步骤
1. 切换到中文界面。
2. 打开总览页, 在健康检查列表中悬停信息检查的忽略按钮和修复片段复制按钮。
3. 使用屏幕阅读器或测试查询窗口右上角最小化、最大化、还原、关闭按钮的 accessible name。

## 期望 vs 实际
期望: 上述用户可触达标签跟随当前语言; 中文界面显示中文文案。

实际:
- `src/renderer/src/pages/overview.tsx` 里健康检查按钮使用硬编码 `title="Ignore info check"` 和 `title="Copy fix snippet"`。
- `src/renderer/src/components/layout/window-controls.tsx` 里窗口控制按钮使用硬编码英文 `aria-label`。

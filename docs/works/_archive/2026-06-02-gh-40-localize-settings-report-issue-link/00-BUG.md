# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: https://github.com/Caldis/berth/issues/40

## 复现步骤
1. 切换到中文界面。
2. 打开设置页或设置弹窗。
3. 滚动到底部 About 区域。

## 期望 vs 实际
期望:

- issue 链接操作使用中文, 例如 `报告问题`。
- `GitHub` 作为站点/产品名保留英文。

实际:

- `src/renderer/src/pages/settings.tsx` 在按钮内硬编码 `Report Issue`, 没有走 i18n。

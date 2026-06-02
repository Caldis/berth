# 需求分析 (Explore 产物)

## 现状理解

涉及的模块:

- `src/renderer/src/components/shared/cost-source-badge.tsx`: 共享费用来源 tag, 当前只渲染 `usage.costSource.{source}` 标签。
- `src/renderer/src/pages/overview.tsx`: Overview 近 7 天费用卡使用 `CostSourceBadge`, 外层用 `title` 和 `aria-label` 补了范围说明。
- `src/renderer/src/pages/usage.tsx`: Usage 摘要卡和费用说明卡使用同一个 `CostSourceBadge`, 费用范围说明只在说明卡内平铺展示。
- `src/renderer/src/i18n/locales/{en,zh}.json`: 已有 `usage.costScopeNotice` 和 `usage.costSource.*` 标签, 但没有按来源拆分的解释文案。

这是渲染层 UI 说明问题, 不涉及主进程、IPC、扫描器或费用计算契约。费用来源值来自 `UsageSummary.costSource`, 类型属于 `src/shared/types/asset.ts` 的内部数据模型。

## 关联与依赖

- `CostSourceBadge` 是共享组件, 改动会同时影响 Overview 和 Usage, 比在页面局部重复 `title` 更稳。
- Overview 当前外层 `title` 只说明“本地扫描数据和价格表估算可能与供应商账单不同”, 没解释 `mixed` / `actual` / `estimated` / `unknown` 各自含义。
- Usage 已平铺 `usage.costScopeNotice`, 但用户 hover 到 tag 时仍只能看到短标签。
- 当前 UI 密度较高, tag 需要保持一行内紧凑展示; 解释应走原生 `title` 和可访问文本, 不引入大型浮层或新增布局块。

## 验收标准

1. `CostSourceBadge` 对 `actual` / `estimated` / `mixed` / `unknown` 都提供来源解释, 用户 hover tag 可读到具体含义。
2. 解释文案通过 i18n 提供中英文, 不暴露 `actual` / `estimated` / `mixed` / `unknown` 原始 enum 给用户。
3. Overview 与 Usage 使用共享 badge 后自动获得同一套解释, 不在页面内重复维护来源说明。
4. 解释需要对辅助技术可见, 至少通过 `aria-label` 把短标签和说明组合起来。
5. 布局保持紧凑, 不新增平铺说明块, 不挤压费用数值、图表或 Usage 说明卡。

## 界面质量与交互验收

- 现有页面结构: Overview 左右双栏, 费用卡右上角展示来源 tag 和金额; Usage 顶部摘要卡与费用说明卡展示同一来源 tag。
- 设计系统用法: 沿用 `rounded-md border px-1.5 py-0.5 text-[11px]` 的紧凑 tag 样式, 不新增重色浮层。
- 信息密度: tag 表面仍只显示短标签; 解释仅在 hover / 读屏路径出现。
- 主要用户路径: 用户看到费用数值时, hover 来源 tag 即可知道金额来自 provider 实报、本地估算、混合还是未知。
- 可见状态: 四种来源状态保持既有颜色分层; 未知态仍为低强调。
- 交互反馈: 原生 title 提示不引入新 JS 状态; keyboard/reader 依靠 `aria-label`。
- 响应式和可访问性风险: 长说明不进入常规布局, 避免移动端挤压。`aria-label` 需要包含短标签和解释, 防止读屏只读“混合”。

## 未决问题

无。实现范围和文案边界已由 issue 和现有组件确定。

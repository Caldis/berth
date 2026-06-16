# 来源快照 (只读)

> user-request 来源快照。任何阶段不回写。详细技术分析见 01-ANALYSIS.md。

来源: 用户分析请求 (Claude Code 会话) + GitHub Issue [#136](https://github.com/Caldis/berth/issues/136)

## 用户原始诉求

> 帮我分析一下 [团队] 模块里面的收起展开的手风琴组件和其他模块里面 (例如[约定]) 的手风琴组件有什么区别, 为什么 [团队] 里面的有过渡动画且布局优雅而其他的没有. 如何统一?
>
> 先将分析结果作为 works 任务落盘, 我会在另一个设备上继续开发。

## 范围界定

- 模块映射: **[团队]** = teams 页 (`src/renderer/src/pages/teams.tsx`); **[约定]** = instructions 页 conventions tab (`src/renderer/src/pages/instructions.tsx`, i18n `instructions.tabs.conventions` = "约定", `zh.json:44/624`)。
- 任务定位: UI 一致性维护 (maintenance / ui-ux) — 抽共享折叠原语并统一全局折叠动效与布局。
- 不改动折叠所承载的业务数据与信息架构。

## 交接说明

本任务由用户要求"先落盘、另一设备续跑"建立。建任务态时已完成静态代码层面的 explore 分析 (见 01-ANALYSIS.md), phase 保持 `explore`: explore 收口仍需补外部 UI primitive 官方文档验证 (不变量 9)。

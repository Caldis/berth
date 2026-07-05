# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源: 用户会话请求 (2026-07-05); GitHub Issue https://github.com/Caldis/berth/issues/156

## 正文

用户原话:

> 我需要你优化这个项目的更新体验
> 请参考 D:/Code/bobcorn 的更新交互, 以及其左侧边栏的更新检查/下载/进度展示/错误提示/更新内容浮层弹窗的完整UI/UX, 优化这个项目的版本更新功能和ui体验

要点拆解:

1. 参考对象: 本机另一项目 `D:/Code/bobcorn` 的版本更新交互实现。
2. 参考范围 (bobcorn 左侧边栏的完整更新 UI/UX):
   - 更新检查入口与状态展示
   - 下载与进度展示
   - 错误提示
   - 更新内容 (release notes) 浮层弹窗
3. 目标: 优化 berth 的版本更新功能与 UI 体验 (功能 + UI 双维度)。

## 现状备注 (建档时快照, 非需求)

- 主进程: `src/main/updater.ts` (GH-124/GH-134) 已有可测试 auto-update 状态机, 全平台真实下载安装。
- 渲染进程: 更新 UI 仅在 Settings 页 (`update-section.tsx` + `use-update.ts`), 无侧边栏常驻入口。

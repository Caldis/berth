# 需求分析 (Explore 产物)

## 现状理解

`src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 中的生命周期侧边栏已经是页面内 sticky 区域。阶段列表由 `groups.map(...)` 渲染为一组 `button`, 点击后只执行 `scrollIntoView`。

当前缺口:

- 侧边栏没有 active state。
- 按钮没有 `aria-current`, 读屏和键盘用户无法知道当前阶段。
- 视觉上也没有稳定的当前项, 只有 hover。

现有测试文件 `tests/renderer/hooks-lifecycle-view.test.tsx` 已覆盖 sticky sidebar、数字 tag、健康检查 hover 和 hooks 行展示, 适合补一个窄测试。

## 关联与依赖

- `groupHookAssetsByStage` 会随 `assets / agentView / hookSchemas` 改变列表, active stage 需要在列表变化后保持合法。
- `scrollToStage` 目前直接查找 `hook-stage-${id}`。新增状态不能破坏滚动行为。
- UI 风格要保持工具型、紧凑, 不在此任务重做页面视觉。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. 初始渲染时, 生命周期侧边栏第一个阶段按钮有 `aria-current="true"`。
2. 点击任一阶段按钮后, 该按钮变为当前项, 原按钮不再是当前项。
3. 点击阶段仍会调用对应 section 的 `scrollIntoView`。
4. 当前项有稳定视觉状态, 与 hover/focus 不冲突。
5. renderer 测试覆盖当前阶段语义。

## 界面质量与交互验收

页面结构: 左侧 sticky 生命周期索引 + 右侧阶段详情。

设计要求: 使用现有 `rounded-md`, `bg-accent`, `text-foreground`, `text-muted-foreground` 风格, 不增加新卡片或大块说明。当前项状态要足够清楚, 但不能抢过右侧内容层级。

交互要求: 鼠标点击和键盘触发都走原生 button 行为; `aria-current` 是主要语义。响应式保持现有横向滚动列表。

## 未决问题

无。该任务不处理 scroll spy 自动跟随视口, 只处理点击/初始状态语义。

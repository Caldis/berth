# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:

- GitHub Issue: https://github.com/Caldis/berth/issues/64
- 来源: hooks 生命周期 UI 后续可用性检查。

## 正文

hooks 生命周期侧边栏已经是 sticky 的高频交互区, 但当前阶段只靠视觉样式表达。键盘用户和读屏用户无法知道哪个阶段是当前选中的目标。

目标:

1. 侧边栏当前阶段按钮暴露 `aria-current`。
2. 点击阶段后更新当前阶段状态, 不只滚动页面。
3. 保持现有紧凑工具型视觉, 不重做 hooks 页面布局。
4. 增加 renderer 测试覆盖当前阶段语义。

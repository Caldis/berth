# 需求分析 (Explore 产物)

## 现状理解
这是 renderer 侧中文 locale 漏翻, 不涉及主进程、IPC 或扫描数据。

`Sidebar` 通过 `t('agentView.all')` 渲染顶部过滤器选项。英文 locale 是 `All`; 中文 locale 也写成了 `All`, 造成中文界面可见英文。

## 关联与依赖
`Claude` 和 `Codex` 是产品名, 不需要翻译。`agentView.label` 已是 `Agent 视角`, 不在本任务内扩展命名。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 中文 sidebar agent 过滤器中 all option 显示 `全部`。
2. 英文 sidebar agent 过滤器中 all option 仍显示 `All`。
3. 选择器更新全局 `agentView` 的行为不退化。
4. 目标 renderer 测试、lint、typecheck、harness 检查通过。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。

- 页面结构: 不改 sidebar 布局。
- 组件选择: 继续使用原生 select。
- 信息密度: 只替换短标签。
- 主要路径: 用户在中文界面打开应用时, 顶部过滤器不出现英文 `All`。
- 状态和可访问性: 不改 focus、aria 或键盘行为。

## 未决问题
留给 design 向人澄清。

无。

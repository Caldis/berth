# 需求分析 (Explore 产物)

## 现状理解
这是 renderer 设置页的可见文案漏翻, 不涉及主进程、IPC 或数据扫描。

相关代码:

- `src/renderer/src/pages/settings.tsx` 的 About 区域大多数文案来自 `t(...)`。
- 同一块中 `GitHub` 是专名, 可以保持字面量。
- `Report Issue` 是操作文案, 当前硬编码英文, 中文 locale 无法覆盖。

## 关联与依赖
不改外链 URL, 不改设置页布局, 不改按钮结构。只补 locale key 并替换硬编码文案。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 中文设置页不再显示硬编码 `Report Issue`, 改为中文操作文案。
2. 英文设置页仍显示 `Report Issue`。
3. `GitHub` 链接文案保持不变。
4. 目标 renderer 测试、lint、typecheck、harness 检查通过。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。

- 页面结构: 不改设置页 About 区域布局。
- 设计系统: 保持现有 text button + icon 样式。
- 信息密度: 只替换短文案。
- 主要路径: 用户在中文设置页中看到一致语言的操作按钮。
- 状态和可访问性: 不改 loading/empty/error/disabled/focus 或 aria。

## 未决问题
留给 design 向人澄清。

无。

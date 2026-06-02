# 需求分析 (Explore 产物)

## 现状理解
问题集中在 renderer:
- `src/renderer/src/pages/overview.tsx`: 健康检查 action button 的 `title` 直接写英文。
- `src/renderer/src/components/layout/window-controls.tsx`: 自定义标题栏窗口按钮的 `aria-label` 直接写英文。
- i18n 资源位于 `src/renderer/src/i18n/locales/{en,zh}.json`。

## 关联与依赖
窗口控制按钮依赖 preload 暴露的 `window.api.window.*`, 文案修改不改变 IPC 契约。Overview 健康检查数据来自 health engine, 本任务只改控制按钮文案, 不改检查逻辑、健康检查数据结构或视觉层级。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 中文界面下, Overview 健康检查忽略按钮和复制修复片段按钮的 `title` 显示中文。
2. 中文界面下, 窗口控制按钮的 accessible name 显示中文: 最小化、最大化、还原、关闭。
3. 英文界面仍显示原有英文标签, E2E 里依赖英文窗口按钮的行为不被破坏。
4. 变更只触及 i18n 资源、相关组件和对应测试。

## 界面质量与交互验收
这是小范围文案和可访问性修复。现有按钮尺寸、图标、hover 样式和布局保持不变; 只让 title / aria-label 跟随当前语言, 避免中文界面夹杂英文控制说明。

## 未决问题
无。

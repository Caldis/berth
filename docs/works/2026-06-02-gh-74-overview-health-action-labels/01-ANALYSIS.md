# 需求分析 (Explore 产物)

## 现状理解
涉及模块:
- `src/renderer/src/pages/overview.tsx`: Overview health checks 渲染健康检查列表、忽略 info 检查按钮、复制 fix snippet 按钮。
- `tests/renderer/overview-health-checks.test.tsx`: 已覆盖 health check 分组、复制、忽略、中文本地化, 但当前用 `getByTitle` 查询按钮, 没有验证 accessible name。
- `src/renderer/src/i18n/locales/*.json`: 已有 `overview.healthCheckActions.ignoreInfo` 和 `overview.healthCheckActions.copyFixSnippet` 文案。

当前两个图标按钮只设置了 `title`。这能提供鼠标悬浮提示, Testing Library 也会把 `title` 作为 role/name 查询的兜底名称; 但按钮缺少显式 `aria-label`。上轮 CDP 属性审计输出显示这些按钮 `text=""`、`aria=null`、`title` 有值, 说明实现依赖隐式兜底, 不利于保持 icon-only 控件语义一致。

## 关联与依赖
修复可以限制在 Overview 页面:
- 两个图标按钮复用现有 i18n 文案作为 `aria-label`。
- 保留现有 `title` 作为鼠标提示。
- 不改变按钮位置、尺寸、颜色、点击逻辑、localStorage 忽略逻辑和剪贴板逻辑。

## 验收标准
1. 英文环境下, ignore info 按钮有 `aria-label="Ignore info check"` 且可通过 role/name 查询。
2. 英文环境下, copy fix snippet 按钮有 `aria-label="Copy fix snippet"` 且可通过 role/name 查询。
3. 中文环境下, 两类按钮有中文 `aria-label` 且可通过 role/name 查询。
4. 复制和忽略功能保持原行为。
5. Overview 页面布局不新增可见文字, 图标按钮仍保持紧凑。
6. 目标 renderer 测试、web typecheck、harness 检查通过。

## 界面质量与交互验收
Overview 是用户进入应用后最先看到的状态页面。健康检查动作按钮属于高频修复流的一部分, 需要可键盘访问、读屏可理解。

本任务不做视觉重设计, 只补齐语义:
- 视觉: 不新增可见标签, 不改变信息密度。
- 交互: 复制、忽略和点击 health check 跳转逻辑不退化。
- 可访问性: 图标按钮有本地化 accessible name。
- i18n: 复用现有文案, 不新增翻译 key。

## 未决问题
无。

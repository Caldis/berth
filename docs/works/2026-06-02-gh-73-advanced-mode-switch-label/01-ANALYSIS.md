# 需求分析 (Explore 产物)

## 现状理解
涉及模块:
- `src/renderer/src/pages/settings.tsx`: `Toggle` 组件渲染 `role="switch"` 按钮, `SettingsContent` 用它控制 `berth-advanced-mode`。
- `tests/renderer/settings-page.test.tsx`: 已覆盖 Settings 页主要按钮、主题/语言 radio group 的可访问名称与键盘选择。
- `src/renderer/src/i18n/locales/*.json`: 已有 `settings.advancedMode` 和 `settings.advancedModeDesc` 文案, 可直接复用作开关名称。

当前 `Toggle` 的视觉标签在按钮左侧, 但没有通过 `aria-label` 或 `aria-labelledby` 与按钮关联。屏幕阅读器和可访问性树只能看到一个空名称的 switch。

## 关联与依赖
`Toggle` 当前只在 Advanced Mode 这一处使用。修复范围可以限制在 Settings 页:
- 给 `Toggle` 增加必填 `ariaLabel`。
- Advanced Mode 使用 `t('settings.advancedMode')` 作为名称。
- 不改变布局、颜色、尺寸、状态切换逻辑和 localStorage 行为。

## 验收标准
1. Settings 页 Advanced Mode switch 能通过 `getByRole('switch', { name: 'Advanced Mode' })` 查询。
2. 中文环境下该 switch 能通过 `getByRole('switch', { name: '高级模式' })` 查询。
3. 点击 switch 后 `aria-checked` 与 `localStorage['berth-advanced-mode']` 正确更新。
4. Settings 弹窗视觉布局保持紧凑, 不新增可见说明块或多余文字。
5. 目标 renderer 测试、web typecheck、harness 检查通过。

## 界面质量与交互验收
Settings 是高频配置入口, 当前布局是小型分组卡片。这个任务只修复可访问名称, 不调整整体视觉主题。验收重点:
- 视觉: Advanced Mode 行不新增占位文字, 开关尺寸和对齐保持原样。
- 交互: 鼠标点击与键盘 focus 行为不退化。
- 可访问性: switch 有稳定、本地化、可查询的名称。
- i18n: 复用现有标题文案, 不新增重复翻译 key。

## 未决问题
无。

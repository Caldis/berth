# 需求分析 (Explore 产物)

## 现状理解
- 相关页面位于 `src/renderer/src/pages/settings.tsx`, 属于 renderer 层, 不涉及 Electron main / preload / IPC 契约变更。
- Settings > Appearance 中 Theme 和 Language 都是互斥选项, 但当前实现是普通 `button` 列表。选中态只通过边框、背景色和 `Check` 图标表达。
- 同一页面里的 Advanced Mode 已使用 `role="switch"` 和 `aria-checked`, 说明设置页已有显式可访问状态的局部模式。
- W3C APG Radio Group Pattern 将 radio group 定义为一组最多只能选中一个的可检查按钮; MDN 也明确 `aria-checked` 应放在关联的 `radio` 上, 而不是 `radiogroup` 自身。

## 关联与依赖
- `useTheme()` 来自 `src/renderer/src/components/theme-provider.tsx`, `setTheme()` 会写 `berth-theme` 并调用 `window.api.theme.set()`。
- 语言切换在 `settings.tsx` 内直接调用 `i18n.changeLanguage(lang.id)` 并写 `berth-language`。
- 现有测试 `tests/renderer/settings-page.test.tsx` 只覆盖 Report Issue 的中英文渲染, 未覆盖外观选项的角色、选中态或交互。
- 主题默认值在 `ThemeContext` 是 `system`; 若测试要覆盖主题变更, 需要用 `ThemeProvider` 包住 SettingsContent, 否则 `setTheme` 是空函数。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Theme 选项组暴露为一个有可读名称的 `radiogroup`。
2. Theme 下每个选项暴露为 `radio`, 并用 `aria-checked` 反映当前主题。
3. Language 选项组暴露为一个有可读名称的 `radiogroup`。
4. Language 下每个选项暴露为 `radio`, 并用 `aria-checked` 反映当前语言。
5. 鼠标点击仍能更新主题、语言和本地存储。
6. 键盘方向键能在同一组内切换选项并移动焦点, 不扩大到其它设置项。
7. 视觉布局、间距和现有文案保持不变。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。

- 页面结构: SettingsContent 是窄栏设置页, Appearance 区块用 card 容器, Theme/Language 是横向分段按钮。
- 设计系统: 使用 Tailwind token (`border-border`, `bg-card`, `bg-accent/10`) 和 lucide 图标。
- 信息密度: 当前外观选项占用空间合理, 不需要新增说明文案或提示块。
- 主要路径: 用户打开设置后选择主题或语言, 希望立即生效。
- 可见状态: 当前选中态视觉清楚, 但非视觉状态不足。
- 交互反馈: hover/selected 样式已有, 需要保留; focus 使用默认浏览器轮廓即可, 不在本任务重做样式。
- 响应式: 当前 `flex gap-2` 在窄屏可能保持横排; 本任务不改变布局。
- 可访问性风险: 给按钮添加 `role="radio"` 后, 需要同步处理 `aria-checked` 与方向键, 避免只改角色不改行为。

## 未决问题
留给 design 向人澄清。

- 无。该缺口可从代码和可访问性标准直接确定, 不需要用户进一步澄清。

## 参考

- W3C APG Radio Group Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/radio/
- MDN radiogroup role: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/radiogroup_role

# 需求分析 (Explore 产物)

## 现状理解
这是 renderer 侧语言初始化 bug, 不涉及主进程、IPC 或本地扫描数据。

相关代码:

- `src/renderer/src/pages/settings.tsx`: 语言按钮点击后调用 `i18n.changeLanguage(lang.id)`, 并写入 `localStorage.setItem('berth-language', lang.id)`。
- `src/renderer/src/i18n/index.ts`: i18next 初始化时只根据 `navigator.language.startsWith('zh')` 选择 `zh` 或 `en`。

因此保存值只影响当前 session, 下次初始化不会被读取。

## 关联与依赖
支持语言当前只有 `en` 和 `zh`。修复不应扩大语言列表, 也不改变设置页交互。

需要注意非法本地值: 用户或旧版本可能写入任意字符串, 初始化必须回退到系统语言, 不能把未知值直接传给 i18next。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. `localStorage.berth-language=zh` 时, i18n 初始化语言为 `zh`。
2. `localStorage.berth-language=en` 时, i18n 初始化语言为 `en`。
3. 保存值缺失或非法时, 继续按 `navigator.language` 回退。
4. 设置页现有语言切换行为不退化。
5. 目标测试、lint、typecheck、harness 检查通过。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。

- 页面结构: 不改设置页布局, 只让已有语言按钮的保存值在初始化时生效。
- 设计系统: 不新增组件, 不改变按钮、tag、弹窗或导航。
- 信息密度: 不新增可见文案。
- 主要路径: 用户在设置页选择语言后, 重新打开应用仍保持该语言。
- 状态: loading/empty/error/disabled/focus 不受影响。
- 可访问性: 不改变键盘顺序或 aria。

## 未决问题
留给 design 向人澄清。

无。

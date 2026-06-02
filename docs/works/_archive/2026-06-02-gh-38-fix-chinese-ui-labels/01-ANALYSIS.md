# 需求分析 (Explore 产物)

## 现状理解
这是 renderer 侧 i18n 漏翻, 不涉及主进程、IPC 或数据契约。

实测截图确认中文界面里有两处明显英文混入:

- 设置弹窗的插件区标题来自 `settings.agentPlugins`, 中文 locale 当前值仍是 `Agent Capability Plugins`。
- 功能说明统计 tag 来自 `assetGuide.evidence.providers`, 中文 locale 当前值是 `个 provider`; 同一组 tag 的 `资产`、`来源`、`风险` 已是中文。

相关代码:

- `src/renderer/src/components/settings/agent-capability-plugins-section.tsx` 使用 `t('settings.agentPlugins')` 渲染标题。
- `src/renderer/src/lib/feature-guidance.ts` 生成 `assetGuide.evidence.providers` 证据项。
- `src/renderer/src/i18n/locales/zh.json` 持有漏翻值。

## 关联与依赖
`en.json` 的英文表达保持不变。修复只改中文 locale 和覆盖中文渲染测试。

测试现状:

- `tests/renderer/settings-agent-plugins.test.tsx` 当前断言英文标题。
- `tests/renderer/feature-guide-panel.test.tsx` 当前只覆盖英文 evidence 标签。

这两类测试可以直接扩展到中文 locale, 避免未来再把未翻译文案写回中文界面。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 中文设置弹窗插件区标题不再显示 `Agent Capability Plugins`, 改为中文。
2. 中文功能说明统计 tag 不再显示 `provider`, 改为中文。
3. 英文 locale 不回退或误改, 现有英文测试继续通过。
4. 目标 renderer 测试、lint、typecheck、harness 检查通过。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。

- 页面结构: 设置页使用 `SettingsContent` 内的分组标题; 能力/指令/会话说明使用 `FeatureGuidePanel` 的渐进披露和 evidence tag。
- 设计系统: 不新增组件, 继续使用现有 Badge/section 标题样式。
- 信息密度: 只替换短标签, 不增加解释性内容。
- 主要路径: 用户打开设置或能力页时, 中文界面应保持一致语言。
- 可见状态: loading/empty/error 不受影响。
- 响应式与可访问性: 不改布局和交互, 只改可见文本。

## 未决问题
留给 design 向人澄清。

无。

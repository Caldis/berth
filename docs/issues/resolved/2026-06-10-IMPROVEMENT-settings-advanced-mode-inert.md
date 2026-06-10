# 描述
- Settings 页 "高级模式" 开关无任何功能效果: `advancedMode` useState 的消费者只有开关组件自身 (`enabled`/`ariaLabel`), 不门控任何 UI 区块或行为, 属可见但 inert 的功能面。

# 证据
- `src/renderer/src/pages/settings.tsx:92` useState 定义; `:296-302` 唯一消费 (Toggle 自渲染 + i18n 标签)。
- 全仓 grep `advancedMode` 仅上述 5 处 (GH-115 架构分析核验, 2026-06-10)。

# 预期 · 建议
- 二选一: (a) 赋予真实语义 — 明确哪些设置区块属"高级"并由其门控; (b) 判定无此产品方向, 移除开关与 `settings.advancedMode*` i18n key。
- 决策影响 settings 页结构 (GH-115 渲染层重构会触碰 settings.tsx, 届时只保持现状不替决策)。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10) 旁支发现。关联 docs/works/_archive/2026-06-10-gh-115-architecture-refactor/。

# 终态 (2026-06-10, RESOLVED — 选项 (b) 移除)
- 判定依据: 开关自始零门控效果 (localStorage `berth-advanced-mode` 全仓零读取方), 对用户是纯误导控件; 「显示临时/调试/缓存资产」的真实能力从未实现。死控件不应留在产品面。
- 移除: settings.tsx 的开关 UI 块 + advancedMode 状态/handler + 唯一消费它的本地 Toggle 组件 (孤儿连带); zh/en `settings.advancedMode*` i18n key; 测试改为「不再渲染 inert switch」守卫断言 + 保留中文插件文案断言。
- 验证: settings 三测试套件 9/9 + typecheck/lint 绿。
- 若未来真要「高级模式」(显示临时/调试/缓存资产), 属新 FEATURE 需求: 实现真实门控逻辑后再加控件, git 历史可参考本次删除的 UI 形态。

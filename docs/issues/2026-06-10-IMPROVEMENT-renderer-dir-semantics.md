# 描述
- 渲染层 3 条反向 import 边均为目录语义错位: pages/settings.tsx 无路由 (唯一消费者是 layout/settings-dialog, 实为对话框内容); memory-view.tsx 880 行事实页面住 components/ 且自注册 page-chrome (feature→layout 边); local-source-copy.ts 自建 EN/ZH 双语字典绕过 i18next (唯一平行翻译机制, GH-115 T3 已迁至 layout/ 消费者旁但字典未并入 i18next); sessions 专属三件 (category-jump-nav/token-spark-bar/asset-count-chip) 住 shared/。

# 预期 · 建议
- SettingsContent 移 components/settings/ 删伪页面; memory-view chrome 注册上提回 instructions 页; local-source-copy 字典迁 en/zh.json sources.* 前缀; sessions 三件迁 components/sessions/。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R32, 低优)。与 renderer-god-pages 同窗口顺做。
- 状态: OPEN。

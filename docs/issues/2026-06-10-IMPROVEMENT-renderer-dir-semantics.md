# 描述
- 渲染层 3 条反向 import 边均为目录语义错位: pages/settings.tsx 无路由 (唯一消费者是 layout/settings-dialog, 实为对话框内容); memory-view.tsx 880 行事实页面住 components/ 且自注册 page-chrome (feature→layout 边); local-source-copy.ts 自建 EN/ZH 双语字典绕过 i18next (唯一平行翻译机制, GH-115 T3 已迁至 layout/ 消费者旁但字典未并入 i18next); sessions 专属三件 (category-jump-nav/token-spark-bar/asset-count-chip) 住 shared/。

# 预期 · 建议
- SettingsContent 移 components/settings/ 删伪页面; memory-view chrome 注册上提回 instructions 页; local-source-copy 字典迁 en/zh.json sources.* 前缀; sessions 三件迁 components/sessions/。

# 进展 (2026-06-11, 5.2 收敛核实)
- **#1 SettingsContent 迁 components/settings/ (伪页面删除) + #4 sessions 专属三件迁 components/sessions/ — DONE** (提交 170bde3b)。
- **仍 OPEN 余 2 项** (今日代码核实): #2 memory-view.tsx 仍在 components/memory/ 且自注册 page-chrome (import '@/components/layout/page-chrome'); #3 local-source-copy.ts 已随 GH-115 T3 迁至 components/layout/ 消费者旁, 但 EN/ZH 双语字典 (EN_SOURCE_COPY/ZH_SOURCE_COPY + getScanSourceStatusLabel 内联双语) 仍为绕过 i18next 的平行翻译机制, 未并入 en/zh.json。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/_archive/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R32, 低优)。与 renderer-god-pages 同窗口顺做。
- 状态: OPEN (余 #2 memory-view chrome 上提; #3 字典并入 i18next 已 DONE) (2026-06-20, GH-146)。

# 落地更新 (2026-06-20, GH-146)
- **#3 local-source-copy 字典并入 i18next: DONE** — EN_SOURCE_COPY/ZH_SOURCE_COPY + getScanSourceStatusLabel 内联双语并入新建**顶层 sources.*** (code/status/statusCount), 3 函数改吃 t(); 唯一消费点 project-scope-switcher 三处传 t。注: issue 建议的 sources.* 前缀实际用顶层 (projectScope.sources.* 已占用)。en 渲染逐字不变 + ZH missing=未发现 双锁。发现第二份平行字典 settings.agentPluginSources.* (41 叶, 文案不同), 本批不动记后续。work: `docs/works/_archive/2026-06-19-gh-146-i18n-source-dict-and-deadkeys`。
- **#2 memory-view chrome 上提: 未做** (偏视觉/布局, A 组稳健批排除需视觉验收项)。

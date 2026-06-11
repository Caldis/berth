# 描述
- 可展开资产卡片在 instructions (MemoryCard/SkillCard/GenericAssetCard) 与 capabilities (McpServerCard) 4 处严格克隆 (~330 行逐字相同脚手架: 外壳 className/FOCUS_HIGHLIGHT/chevron 三元/PluginOriginBadge 槽/focused→展开 effect/DetailRow+ViewRawButton 尾部), 且已漂移 — instructions 重复 6 处 ScopeBadge 覆写而 capabilities 裸用, 两页视觉不一致; 第一代抽象 shared/asset-card.tsx 是孤儿 (GH-115 T3 已删)。

# 预期 · 建议
- 以 instructions 三卡为基建 `shared/ExpandableAssetCard` (icon/title/badges/meta/expanded children + focused 内置, DetailRow+ViewRawButton+ShowInExplorer 默认尾槽), 四处收敛。
- 与 heroui-migration-followup 的 chevron→Accordion 项合并执行, 避免同区域两次重构。
- **前置**: instructions/capabilities 是 3-4 个 verify 任务足迹, 待在途任务收口后做; 10 个零直测组件先补最小行为测试再动 (01-ANALYSIS 风险 8)。
- **前置已解除 (2026-06-11, 5.2 收敛核实)**: docs/works/ 全部归档、无在途任务, "待在途任务收口"条件满足; 仅余"先补最小行为测试"作为执行时首步。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R8, 对抗验证)。关联 2026-06-05-IMPROVEMENT-heroui-migration-followup.md。
- 状态: OPEN。

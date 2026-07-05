# IMPROVEMENT: zh 文案 agent 术语统一 (agent vs 智能体)

状态: OPEN (低优, 文案一致性)

## 背景
2026-07-05 侧栏筛选器语义调整中, 用户裁定侧栏 agent 维度筛选器 zh 文案使用「智能体」
(`agentScope.*`: 智能体 / 全部智能体 / 智能体选项)。这是 zh locale 中「智能体」的首次引入。

此前全应用 zh 文案对 agent 一律保留英文原词, 现存至少:
- Overview 欢迎语「widget 会随 Berth 扫描你的 agent 逐步填充」
- 搜索字段标签 `search.fields.agentId` = "Agent"
- 会话筛选条 (session-filter-bar) 的 agent 维度文案
- 导航「子代理 / 专用 Agent 角色」等混合用法

同一概念双词并存会造成术语漂移: 同屏可能同时出现「智能体: 全部」与「Agent」字段标签。

## 建议
产品统一裁定 zh 术语 (全用「智能体」或仅此筛选器特例), 然后全量清一遍 zh.json 与
组件内硬编码文案; 顺带明确「子代理 (subagent)」是否随之改「子智能体」。

## 来源
2026-07-05 侧栏项目/agent 筛选器 UIUX 优化专项 (语义定名批次), 交叉引用记录, 不混入本批。

# PRD 快照 (只读)

来源:

- GitHub Issue: https://github.com/Caldis/berth/issues/28
- Parent: `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`
- Local issue: `docs/issues/2026-06-02-FEATURE-hooks-ui-schema-driven-presentation.md`

## 正文

### 背景

Agent Capability Plugin 已经能声明 Claude Code / Codex 的 Hook event、lifecycle stage、matcher 支持、handler type、主展示字段、必填字段和运行模式。但 Hooks 页面仍有 renderer 侧硬编码, 例如按 agent 或 handler type 判断展示字段与支持差异。

### 范围

- 让 Hooks UI 尽可能从 plugin `hookSchema` 读取 event / handler 展示信息。
- Hook 行展示常见字段: type、主目标字段、Windows command override、运行模式、必填字段摘要和 raw JSON 入口。
- 保持生命周期侧栏、健康 hover、恢复中心和启用/禁用行为不变。
- 维持渐进披露: 高频字段直接展示, 低频细节放进详情或 hover/focus。

### 验收

- Hooks UI 能根据 plugin `hookSchema` 渲染 hook type 与主字段。
- Claude Code / Codex 差异尽可能来自 plugin metadata。
- 现有 Hooks lifecycle、health hover、recovery center 和 toggle 测试继续通过。
- UI 保持紧凑, 不增加默认解释噪音。

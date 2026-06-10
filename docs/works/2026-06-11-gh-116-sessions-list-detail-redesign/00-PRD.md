# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源: 用户直接需求, 2026-06-11。GitHub Issue: https://github.com/Caldis/berth/issues/116

## 正文

### 用户原话

> 我想全面优化 [会话] 功能的列表页面和详情页面
> - 列表页面的数据呈现形式, 布局, 我都想全面重构, 基于实际用户检索和查询, 以及 agentic 开发的角度进行重新设计
> - 详情页面的顶部 tab 使用 heroui 的 tab 组件
> - 详情页面的时间线模块进行重新设计, 特别是时间线, 我希望将其重构为会话内容的重放, 并参考 ClaudeConsole 内的 ManagedAgents 界面的 Sessions 的 Debug 界面为参考对整个会话的时间线进行重新设计

### 参考截图

用户提供 ClaudeConsole ManagedAgents → Sessions → Debug 界面截图, 存档于本目录 `ref-claudeconsole-sessions-debug.png`。

截图关键要素 (供无法看图的会话交接):
- 顶部: agent 名称 + 状态徽章 (Idle) + 元信息行 (agent 类型、分支 Main、运行时长 2d 23h、token 用量 40.5k/2.4k、相对时间 2 days ago)。
- 视图切换: Transcript / Debug 两个 tab; 旁边事件类型过滤下拉 (All events) 与搜索按钮。
- 时间轴刷子 (scrubber): 横向轨道, 事件以竖向刻度线分布, 当前位置有手柄, 可拖动定位。
- 主体左侧: 事件流列表, 每行 = 类型徽章 (Interrupt/Running/Thread/User/Model/Thinking/Agent/Tool/Result/Idle) + 单行摘要 + 右对齐时间戳 (0:04:16 形式, 相对会话起点)。
- 主体右侧: 选中事件详情面板 — 类型徽章 + 标题、时间戳、事件 id、事件原始 JSON payload (语法高亮, 等宽字体)。
- 底部: 向 agent 发消息的输入框 (本任务不一定需要)。

### 需求拆解

1. **列表页全面重构**: 数据呈现形式与布局重新设计, 设计依据 = 实际用户检索/查询场景 + agentic 开发视角 (多 Agent 并行开发场景下, 关心哪个 agent/项目/时间段发生过什么)。
2. **详情页顶部 tab**: 使用 heroui Tabs 组件替换现有实现。
3. **详情页时间线 → 会话重放**: 时间线模块重构为会话内容的重放 (replay), 整体交互参考上述 Debug 界面 (事件流 + 时间轴刷子 + 详情面板)。

# 描述
- Sessions 页面在 800+ 条会话数据下进入缓慢, 当前实现只做渐进挂载, 没有列表虚拟化。
- 2026-06-04 本机实测: snapshot 含 901 个资产、833 个 session; `window.api.sessions.list({ agentView: "all" })` 热态耗时约 10-16 ms, payload 约 602 KB。
- 同一数据规模下, Sessions 页面首批行约 115-226 ms 出现, 约 1.05-1.30 s 后 833 条全部进入 DOM; 最终页面约 907 个 button 节点、49 个分组容器。

# 重现步骤
- 准备约 800 条本地 Claude Code / Codex session。
- 打开应用, 从首页进入 Sessions 页面。
- 观察列表首批渲染、全部条目挂载时间与页面交互响应。
- 查看实现: `src/renderer/src/pages/sessions.tsx` 中 `INITIAL_VISIBLE_SESSIONS = 80`, `SESSION_RENDER_BATCH_SIZE = 120`, 最终仍通过 `groupSessions.map(...)` 挂载全部可见条目。

# 预期结果
- 800+ 条会话数据下进入 Sessions 页面仍应保持可交互, DOM 节点数量应接近视口内条目数量加少量 overscan。
- 背景刷新不应导致同一批 session 全量重新渲染。

# 实际结果
- 热态 IPC 查询不是主要瓶颈, renderer 仍需要挂载全部 session 行。
- 每次进入页面都会重新创建 Sessions 组件树, 并通过 `useSessions()` 发起同 key 后台刷新; 返回新数组后可能触发同数据的整页重渲染。
- 默认项目分组下, group header、row button、lucide icon、`TokenUsageDisplay` 与 i18n/formatter 在 800+ 行上累积渲染成本。

# 解决方案
- 引入 Sessions 扁平行模型: group header 与 session row 合并为统一 row item, 保留 collapsed group 状态。
- 使用列表虚拟化, 只渲染视口内 row 加 overscan; 分组 header 使用估算或固定高度。
- 给 `useSessions` 增加基于 snapshot id / 更新时间的缓存有效性判断, fresh cache 不在页面进入时立即请求同 key 全量列表。
- 后台刷新结果若 session id 序列和关键字段未变化, 避免 `setSessions()` 触发整页重渲染。

# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户请求: “启动”
- GitHub Issue: https://github.com/Caldis/berth/issues/98
- docs issue: `docs/issues/2026-06-04-IMPROVEMENT-sessions-list-virtualization.md`

## 正文
Sessions 页面在 800+ 条会话数据下进入缓慢, 当前实现只做渐进挂载, 没有列表虚拟化; Memories 等其他列表后续也会遇到同类问题。

已知实测:
- 2026-06-04 本机 snapshot 含 901 个资产、833 个 session。
- `window.api.sessions.list({ agentView: "all" })` 热态耗时约 10-16 ms, payload 约 602 KB。
- Sessions 页面首批行约 115-226 ms 出现, 约 1.05-1.30 s 后 833 条全部进入 DOM。
- 最终页面约 907 个 button 节点、49 个分组容器。

用户要求:
- 引用成熟的第三方虚拟列表组件, 不自行开发虚拟滚动内核。
- 确保列表滚动时条目刷新稳定。
- 确保搜索功能不会触发条目刷新导致严重性能问题。
- 引入优雅的跳转侧边菜单用于快速定位不同类目, 并评估第三方开源组件。
- 后台刷新限流, 避免条目加载和刷新时触发严重性能卡顿。
- 条目刷新、整个 agent 数据扫描引擎迁移至 Service Worker 这部分可能和检索引擎相关, 先计划。

当前 issue 里的初步方向:
- 引入成熟第三方虚拟列表组件, 优先评估 `react-virtuoso` 的 `GroupedVirtuoso`; 备选为 `@tanstack/react-virtual`。
- 提取共享 `VirtualGroupedList` 基础组件: group header 与 item row 合并为稳定 row 模型, 使用稳定 item id 作为 key, 只渲染视口内 row 加 overscan。
- 搜索和筛选只更新 row id 列表, 复用原始 item 对象; 使用 deferred / transition 降低输入期间重渲染成本。
- 引入基于类目的跳转侧边菜单, 优先使用现有 Radix 体系的 `@radix-ui/react-navigation-menu`, 与虚拟列表的 `scrollToIndex` / group navigation 联动。
- 给 `useSessions`、`useMemory` 和资产 runtime 刷新增加限流、同结果 diff 与 fresh cache 判断, 避免后台刷新触发整页重渲染。
- 扫描引擎后续继续使用 main 侧 `worker_threads`; Service Worker 不直接承载本地文件扫描, 检索索引可单独评估迁移到 renderer Web Worker 或 main worker。

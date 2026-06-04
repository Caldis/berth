# 描述
- Sessions 页面在 800+ 条会话数据下进入缓慢, 当前实现只做渐进挂载, 没有列表虚拟化; Memories 等其他列表后续也会遇到同类问题。
- 2026-06-04 本机实测: snapshot 含 901 个资产、833 个 session; `window.api.sessions.list({ agentView: "all" })` 热态耗时约 10-16 ms, payload 约 602 KB。
- 同一数据规模下, Sessions 页面首批行约 115-226 ms 出现, 约 1.05-1.30 s 后 833 条全部进入 DOM; 最终页面约 907 个 button 节点、49 个分组容器。
- 2026-06-04 追加范围: 使用成熟第三方虚拟列表组件; 保证滚动期间条目更新不跳动; 搜索不得触发重型条目刷新; 增加优雅的类目跳转侧边菜单; 后台刷新需要限流。

# 重现步骤
- 准备约 800 条本地 Claude Code / Codex session。
- 打开应用, 从首页进入 Sessions 页面。
- 观察列表首批渲染、全部条目挂载时间与页面交互响应。
- 查看实现: `src/renderer/src/pages/sessions.tsx` 中 `INITIAL_VISIBLE_SESSIONS = 80`, `SESSION_RENDER_BATCH_SIZE = 120`, 最终仍通过 `groupSessions.map(...)` 挂载全部可见条目。
- 查看 Memories 实现: `src/renderer/src/components/memory/memory-view.tsx` 也使用 `notes.map(...)` 全量渲染, 搜索和筛选会重新计算并重建可见列表。

# 预期结果
- 800+ 条会话数据下进入 Sessions 页面仍应保持可交互, DOM 节点数量应接近视口内条目数量加少量 overscan。
- 背景刷新不应导致同一批 session 全量重新渲染。
- Sessions、Memories、Instructions 等列表共享同一套虚拟列表基础设施, 而不是每个页面各自实现滚动策略。
- 类目跳转侧边菜单可快速定位项目、日期、来源、重要性、标签等分组, 且不破坏键盘可达性。
- 2026-06-04 新增产品约束: Sessions 项目类目的可选项应从最后一级项目目录开始; n-1 父级目录只作为不可点击小标题, 例如 `Desktop/Code` 是标题, `berth` / `agentic` 才是可点击项。
- 2026-06-04 新增视觉约束: 不可点击父级小标题必须和可选项目项有明显区分, 避免用户误判标题可点击。
- 2026-06-04 新增布局约束: 左侧类目菜单在桌面宽度不得产生横向滚动; 右侧虚拟列表的不同 group 之间需要可见间距, group header 不得与外层整块边框叠加导致边框变粗。
- 2026-06-04 新增布局约束: 左侧类目菜单桌面态高度应撑满页面可视区域, 内部滚动条覆盖整个菜单高度。

# 实际结果
- 热态 IPC 查询不是主要瓶颈, renderer 仍需要挂载全部 session 行。
- 每次进入页面都会重新创建 Sessions 组件树, 并通过 `useSessions()` 发起同 key 后台刷新; 返回新数组后可能触发同数据的整页重渲染。
- 默认项目分组下, group header、row button、lucide icon、`TokenUsageDisplay` 与 i18n/formatter 在 800+ 行上累积渲染成本。
- `MemoryView` 的搜索、source/importance/tag 筛选在数据量放大后也会产生相同风险, 当前没有跨列表可复用的虚拟化和刷新限流约束。

# 解决方案
- 引入成熟第三方虚拟列表组件, 优先评估 `react-virtuoso` 的 `GroupedVirtuoso`; 备选为 `@tanstack/react-virtual`。
- 提取共享 `VirtualGroupedList` 基础组件: group header 与 item row 合并为稳定 row 模型, 使用稳定 item id 作为 key, 只渲染视口内 row 加 overscan。
- 搜索和筛选只更新 row id 列表, 复用原始 item 对象; 使用 deferred / transition 降低输入期间重渲染成本。
- 引入基于类目的跳转侧边菜单, 优先使用现有 Radix 体系的 `@radix-ui/react-navigation-menu`, 与虚拟列表的 `scrollToIndex` / group navigation 联动。
- Sessions 项目跳转菜单采用父级标题 + 项目项结构: 父级标题不绑定 `onSelect`, 项目项按完整路径滚动到对应虚拟 group。
- 父级标题使用更轻的文字层级和分隔线; 项目项保持按钮形态、较深文字、缩进和选中态边框。
- 桌面左侧类目缩进只使用内部 padding, 不使用会扩展布局宽度的外边距; Sessions 右侧列表移除整块外层边框, 改由每个 group header 与 row 共同形成分组容器。
- 桌面左侧类目导航同时设置 `height` 与 `max-height` 为 `100dvh - --berth-page-top-offset`, 作为侧栏延伸到窗口底部; 使用 `self-start` 避免 flex 拉伸影响内部滚动区域。
- 给 `useSessions`、`useMemory` 和资产 runtime 刷新增加限流、同结果 diff 与 fresh cache 判断, 避免后台刷新触发整页重渲染。
- 扫描引擎后续继续使用 main 侧 `worker_threads`; Service Worker 不直接承载本地文件扫描, 检索索引可单独评估迁移到 renderer Web Worker 或 main worker。

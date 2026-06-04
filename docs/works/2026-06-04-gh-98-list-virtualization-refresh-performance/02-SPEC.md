# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 新增共享 view model:
  - `VirtualListGroup<TItem>`: `{ id: string; label: string; count: number; items: TItem[]; meta?: Record<string, string | number | boolean> }`。
  - `JumpNavItem`: `{ id: string; label: string; count: number; targetIndex: number; tone?: 'default' | 'muted' | 'warning' }`。
  - `VirtualizedListState`: `{ activeGroupId?: string; range?: { startIndex: number; endIndex: number } }`。
- `VirtualListGroup.id` 使用稳定业务维度: Sessions 为 project/date group key, Memories 为 source/importance/tag group key, Instructions 为 scope/type group key。row key 只使用业务 id: session id、memory note id、asset id。
- `useSessions()` 保留现有返回契约 `{ sessions, loading, stale, error }`, 内部增加 cache TTL、in-flight 去重、节流与同结果 signature 比较; 不改变 preload / main IPC 字段。
- `useMemory()` 保留返回契约 `{ result, loading, refreshing, error, refresh }`, 内部增加 module cache、in-flight 去重、TTL、手动 refresh force 参数与同结果 signature 比较; `refresh()` 仍返回 `void | Promise<void>` 的 UI 使用方式。
- 搜索和筛选只派生 group / row id view model, 不复制原始 item 对象; row 组件从稳定 item 引用读取显示字段。
- 扫描引擎边界维持 Electron main + worker_threads。Service Worker 不参与本地文件扫描; 搜索索引 worker 化写入后续计划项, 不改本任务 IPC 契约。

覆盖验收标准: 1, 2, 4, 5, 7, 8, 9。

## 任务分类与 debt
- type / maintenance.subtype: `maintenance / performance`。
- source.kind / refs: `docs-issues`, refs 指向 `docs/issues/2026-06-04-IMPROVEMENT-sessions-list-virtualization.md` 与 GH-98。
- debt.estimate: 维持 `incurred=5, repaid=12, net=-7, scope=global, risk=high, confidence=medium`。Design 未发现需要扩大 IPC 或 main 扫描器范围的事项。
- debt.final 预期: 完成后维持 net 为负值; 若实现中新增迁移范围或 e2e 复杂度, 在 INDEX 追加 revision。
- revisions: 无。
- Project 字段同步: GH Project #6 item 保持 `In Progress`。本阶段只更新本地任务态文档。
- `pnpm harness:stats` 显示 debt total = 7, 低于 40, 无需 override。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- 依赖:
  - 新增 `react-virtuoso` 作为主虚拟列表组件。选它是因为 `GroupedVirtuoso` 直接覆盖分组列表、动态行高、`computeItemKey`、`scrollToIndex` 与 group header。
  - 新增 `@radix-ui/react-navigation-menu` 作为类目跳转菜单 primitive, 沿用现有 Radix 体系。
  - `@tanstack/react-virtual` 只保留为技术备选, 本任务不安装。
- 共享 UI:
  - `src/renderer/src/components/shared/virtual-grouped-list.tsx`: 封装 `GroupedVirtuoso`, 接受 groups、stable key、group renderer、row renderer、empty/loading slot、`onActiveGroupChange`、`scrollToGroup` ref。
  - `src/renderer/src/components/shared/category-jump-nav.tsx`: Radix Navigation Menu 封装, 支持纵向桌面菜单、窄屏 sticky 横向菜单、active 状态、count、键盘导航与按钮 aria-label。
  - `src/renderer/src/hooks/use-app-scroll-parent.ts`: 获取 `[data-testid="app-content-scroll"]`, 作为 Virtuoso `customScrollParent`; 测试环境无元素时使用组件内部滚动容器。
- 共享数据工具:
  - `src/renderer/src/lib/virtual-list-model.ts`: group 构建、jump item 构建、signature、稳定排序与 active group 计算。
  - `src/renderer/src/lib/result-signature.ts`: sessions/memory result signature, 避免同结果刷新触发 state 更新。
- 页面改造:
  - `src/renderer/src/pages/sessions.tsx`: 删除渐进渲染常量和全量 map; 用 project/date group view model + shared virtual list + jump nav; 搜索输入继续走 top nav, 筛选结果通过 `useDeferredValue` 派生。
  - `src/renderer/src/components/memory/memory-view.tsx`: notes 走同一 shared virtual list; source/importance/tag/search 只更新 view model; note detail 继续 lazy load, 使用 stable key 与 Virtuoso 动态高度测量。
  - `src/renderer/src/pages/instructions.tsx`: 至少迁移 skills 与 conventions 两类资产列表到 shared virtual list; 其余 asset tabs 若结构相同则同批迁移。
  - `src/renderer/src/hooks/use-ipc.ts`: 调整 `useSessions()` refresh 策略。
  - `src/renderer/src/hooks/use-memory.ts`: 调整 `useMemory()` refresh 策略。
- Worker / Service Worker 计划:
  - 本任务不新增 Service Worker。
  - 后续若搜索索引构建或 agent 数据扫描触发 renderer 可见卡顿, 优先评估 main worker_threads 或 Web Worker; Service Worker 只适合缓存/请求代理场景。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保留现有 page header、top nav search 与列表行密度; 类目菜单作为窄列导航, 不把 row 改成大卡片。 | Sessions/Memories/Instructions 截图或 DOM 断言确认字段未缺失, 列表区域未被菜单挤压。 |
| 组件选择 / 设计系统一致性 | 虚拟列表使用 `react-virtuoso`; 类目导航使用 Radix Navigation Menu + 现有 Tailwind token、lucide 图标。 | typecheck + renderer tests; CSS 颜色只使用现有中性/semantic token。 |
| 交互反馈 / 状态切换 | active category 随可见 range 更新; 点击/键盘选择类目调用 `scrollToIndex`; refresh 时显示已有 stale/refreshing 状态。 | renderer tests 覆盖 active 状态和 scroll handler; e2e 或 Electron DOM 断言覆盖真实列表。 |
| loading / empty / error / disabled / focus | 沿用现有 loading/empty/error; source unavailable chip 保留 disabled 表达; focus target 在虚拟列表中通过 `scrollToIndex` 定位后再显示 focus ring。 | 既有 tests 更新后继续通过; 新增 focus/jump 测试。 |
| 响应式 / 可访问性 / 键盘可达 | 桌面两列布局: nav 宽度固定、列表自适应; 窄屏 nav 变 sticky 横向菜单。Nav item 是 button/menu item, 带 aria-current/aria-label。 | renderer tests 检查 aria-current; Playwright 视口覆盖 desktop 与 mobile。 |
| 文案 / i18n / 数字和路径格式 | 不新增长文案; 复用现有 i18n key 与 formatter。新增少量通用 label 进入 en/zh。 | i18n key tests 或 renderer snapshot 文本断言; typecheck 保证 key 使用。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| `VirtualGroupedList` stable key、groupCounts、active group、jump ref | renderer | `tests/renderer/virtual-grouped-list.test.tsx` | `pnpm test -- tests/renderer/virtual-grouped-list.test.tsx` | 不适用 |
| `CategoryJumpNav` active/keyboard/aria-current/responsive class | renderer | `tests/renderer/category-jump-nav.test.tsx` | `pnpm test -- tests/renderer/category-jump-nav.test.tsx` | 不适用 |
| Sessions 800+ 条不全量挂载、搜索不重建同结果、类目跳转 | renderer + e2e | `tests/renderer/sessions-pages.test.tsx`, `tests/e2e/app.e2e.ts` 或新 e2e | `pnpm test -- tests/renderer/sessions-pages.test.tsx`; `pnpm test:e2e -- --grep "sessions"` | 不适用 |
| Memories 使用 shared virtual list、过滤/search/tag/source 响应路径、详情 lazy load | renderer | `tests/renderer/memory-view.test.tsx` | `pnpm test -- tests/renderer/memory-view.test.tsx` | 不适用 |
| Instructions skills/conventions 迁移共享列表 | renderer | `tests/renderer/instructions-guidance.test.tsx` 或新文件 | `pnpm test -- tests/renderer/instructions-guidance.test.tsx` | 不适用 |
| `useSessions()` TTL / in-flight / unchanged diff | renderer hook | `tests/renderer/use-sessions-swr.test.tsx` | `pnpm test -- tests/renderer/use-sessions-swr.test.tsx` | 不适用 |
| `useMemory()` cache / TTL / in-flight / manual refresh | renderer hook | `tests/renderer/use-memory-cache.test.tsx` | `pnpm test -- tests/renderer/use-memory-cache.test.tsx` | 不适用 |
| 类型与 harness 合规 | typecheck + harness | 无新增专用文件 | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-98-list-virtualization-refresh-performance` | 不适用 |
| 真实 Electron 列表 DOM 数量与截图 | e2e / manual verify | `tests/e2e/app.e2e.ts` 或 verify 记录 | `pnpm test:e2e -- --grep "large list"` | 若本地 e2e 被环境阻断, 在 verify 记录阻断命令与 renderer DOM 证据。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 共享 `VirtualGroupedList` + `react-virtuoso` | 1, 2, 3, 4, 10 |
| `CategoryJumpNav` + active range | 6, 10 |
| Sessions 页面迁移 | 1, 4, 5, 6, 9, 10 |
| Memories 页面迁移 | 2, 4, 5, 6, 9, 10 |
| Instructions 部分迁移 | 3, 10 |
| `useSessions()` / `useMemory()` refresh 策略 | 5, 7, 10 |
| Worker / Service Worker 边界 | 8 |

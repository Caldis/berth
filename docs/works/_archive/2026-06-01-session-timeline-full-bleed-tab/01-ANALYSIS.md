# 需求分析 (Explore 产物)

## 现状理解

会话详情页在 `src/renderer/src/pages/session-detail.tsx`。当前 Timeline tab 已经从主详情页拆出来, 但 `SessionTimelineTab` 仍渲染为:

- 外层 `rounded-xl border border-border bg-card`
- 内部标题栏 `border-b px-4 py-3`
- `ToolTimeline` 自己再渲染筛选栏和滚动列表

这在两栏主页面时期合理, 因为需要把工具时间线和右侧信息区分开。现在 Timeline 已经是独立 tab, 外层卡片会造成两个问题:

1. 视觉层级重复: tab 已经是页面分区, 再包卡片会显得像嵌在页面里的小部件。
2. 可用宽度浪费: 卡片边框和内边距让高频工具列表看起来仍被装进容器, 不像主工作区。

不需要改主进程、IPC 或数据结构。目标是渲染层布局调整。

## 关联与依赖

- `SessionDetail` 负责 Radix tab 切换。
- `SessionTimelineTab` 只消费 `SessionToolEvent[]`。
- `ToolTimeline` 内部负责失败筛选、耗时 slider、空态和工具行。
- `tests/renderer/sessions-pages.test.tsx` 已覆盖 Timeline tab 切换、失败筛选、耗时筛选和无横向滚动 class。
- 架构边界: 渲染层 UI 修改, 不涉及 `src/main`、`src/preload` 和 `src/shared/types/ipc.ts`。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Timeline tab 不再使用外层卡片样式, 即不再有 `rounded-xl border bg-card` 包裹整个时间线。
2. Timeline tab 顶部信息作为页面标题区展示, 与 tab 页面本身融为一体。
3. 工具筛选条和滚动列表保持完整功能: 失败筛选、耗时 slider、工具 tips 不退化。
4. 工具列表继续 `overflow-x-hidden`, 页面和 timeline 内部不出现横向滚动。
5. 空工具事件状态仍然能在 Timeline tab 内正确展示。
6. Renderer 测试和 `typecheck:web` 通过; harness 检查通过。

## 未决问题

无。

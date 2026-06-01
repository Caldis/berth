# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- 不新增 IPC。
- 不修改 `SessionDetailResult` 或 `SessionToolEvent`。
- 不修改工具耗时、状态或筛选计算逻辑。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- 修改 `src/renderer/src/pages/session-detail.tsx`:
  - `SessionTimelineTab` 从卡片容器改为 page surface。
  - 增加 `data-testid="session-timeline-tab"` 便于测试验证这个 tab 不再是卡片。
  - 顶部标题区使用轻量 `section` 布局, 保留标题、说明和计数。
  - `ToolTimeline` 仍作为列表和筛选逻辑组件, 但筛选区不依赖外层卡片边框。
  - 滚动区域保持 `overflow-x-hidden`, 高度按独立 tab 使用更接近视口的约束。
- 修改 `tests/renderer/sessions-pages.test.tsx`:
  - Timeline tab 切换后断言根节点不再带卡片样式。
  - 保留现有失败筛选、耗时筛选和无横向滚动断言。

## 测试策略

- `pnpm test -- tests/renderer/sessions-pages.test.tsx`
- `pnpm typecheck:web`
- `pnpm harness:check`
- 视觉验收:
  - 打开真实 Electron agent-owned 实例。
  - 进入一个包含大量工具调用的会话详情。
  - 切到 Timeline tab, 确认时间线铺满主内容区、没有外层卡片边框、无横向滚动。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
- page surface `SessionTimelineTab` | 1, 2 |
- 保留 `ToolTimeline` 逻辑 | 3, 5 |
- `overflow-x-hidden` 和视口高度滚动区 | 4 |
- renderer/typecheck/harness/视觉验收 | 6 |

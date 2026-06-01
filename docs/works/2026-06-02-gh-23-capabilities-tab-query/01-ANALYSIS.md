# 需求分析 (Explore 产物)

## 现状理解

本任务只涉及 renderer 页面状态和路由 query, 不改 Electron 主进程、preload、IPC 或本地文件扫描。

相关链路:

- `src/main/engine/health.ts` 的健康检查 target 已使用 `/configuration/capabilities?tab=hooks`。
- `src/renderer/src/pages/overview.tsx` 点击健康检查 target 后会 `navigate(check.target.route)`。
- `src/renderer/src/pages/capabilities.tsx` 目前用 `useState('mcp')` 初始化 `activeTab`, 不读取 URL query。
- `src/renderer/src/main.tsx` 已使用 `MemoryRouter`, 页面组件可以安全使用 `react-router-dom` 的 query API。
- 现有 renderer 测试 `tests/renderer/capabilities-guidance.test.tsx` 直接渲染 `Capabilities`, 需要包一层 `MemoryRouter` 后才能覆盖 URL 行为。

## 关联与依赖

- `TabGroup` 通过 `activeTab` 控制选中态, 通过 `onTabChange(id)` 切换页签。
- Capabilities 页签 id 固定为 `mcp/hooks/plugins/statusLine/permissions/env`。
- `activeTab` 会影响列表过滤、搜索 placeholder、FeatureGuidePanel 的 guide 与 evidence。
- URL query 是页面级 UI 状态, 不需要进入 Zustand 或 IPC 契约。

## 验收标准

1. 打开 `/configuration/capabilities?tab=hooks` 时, Hooks 页签被选中, 页面展示 hooks 指南和生命周期视图。
2. 打开 `/configuration/capabilities?tab=unknown` 时, 页面回退到 MCP 页签。
3. 用户点击其它页签时, URL 的 `tab` query 同步为对应 id, 刷新后仍能保留页签。
4. 现有直接渲染 `Capabilities` 的测试在 `MemoryRouter` 包裹后继续通过。
5. `pnpm test -- tests/renderer/capabilities-guidance.test.tsx` 与 `pnpm typecheck:web` 通过。

## 界面质量与交互验收

- 页面结构不改动: 仍保持标题、TabGroup、FilterBar、FeatureGuidePanel、内容区的层级。
- 信息密度不新增可见控件, URL 同步是状态行为, 不占页面空间。
- 交互反馈沿用现有 TabGroup 选中态; 点击页签后选中态和 URL 同时变化。
- 加载/空/错误/禁用状态不受影响; 非法 query 静默回退到 MCP, 不向用户显示错误。
- 响应式不改动; 不新增会造成横向溢出的元素。
- 可访问性沿用 button 页签; 目标测试用 role/name 断言用户可见状态。

## 未决问题

无。范围明确, 不需要用户补充决策。


# 需求分析 (Explore 产物)

Explore = Workflow 5 路并行只读探查 (data-model / component-pages / plugin-page / navigation-infra / ui-reuse)。结论如下。

## 现状理解 (已核实)

### 数据模型 — 数据已齐, 纯渲染层工作
- 插件 asset id = `plugin:${marketplace}/${name}@${version}`; `meta`={marketplace,version,enabled,...}; `plugin.name` 即显示名。
- 组件 asset 带 `meta.pluginId`(→插件 id)、`meta.pluginName`(插件名)、`meta.marketplace`、`meta.origin`('plugin' | 'codex-plugin')。`scanner.ts:402-439` (claude) / `codex/index.ts:146-162`。
- `relations.ts:47-63` 已算 plugin→组件 `contains` 与 组件→plugin `belongs-to`; `assets:relations` IPC 存在但渲染层目前用客户端过滤。
- 渲染层判定 plugin-origin 的可靠信号 = `meta.pluginId` 存在 (string)。

### 各页面渲染 (定位锚点)
- **Instructions 页** (skills/conventions/subagents/commands/output-modes/memories): `VirtualGroupedList` 按 scope 分组; 卡片 `data-testid="instruction-asset-card-${asset.id}"`, 局部 useState 展开, 显示 `ScopeBadge`。**当前无来源插件标识**。`instructions.tsx:50-271,466-490`。
- **Capabilities 页**:
  - MCP: `McpServerCard` (无 testid)。`capabilities.tsx:66-131`。
  - Hooks: `HooksLifecycleView` (阶段 `id="hook-stage-${id}"` + getElementById scrollIntoView; HookAssetRow 无 testid)。`hooks-lifecycle-view.tsx:97-100,144`。
  - Plugins: `PluginCard` (`data-plugin-card`, 无 id) + HeroUI Accordion 按 type 分组组件; 组件行 `data-plugin-component` **无 onClick/无 testid**。`capabilities.tsx:193-267,935-952`。

### 跨页导航/定位基础设施 (关键复用)
- 路由 `/instructions/${section}` `/capabilities/${section}` 经 `activeSection` prop; **无 query/hash 资产级 deep-link**。`App.tsx:41-60`。
- `search-dialog.routeForAsset(type)` 已映射 type→页面路由 (skill→/instructions/skills, hook→/capabilities/hooks, mcp-server→/capabilities/mcp, plugin→/capabilities/plugins…)。`search-dialog.tsx:378-393`。**复用/抽共享**。
- **memory-view 聚焦范式 (金标准)**: `navigate→clearFilters→setFocusId→scrollToItem(id,'center')→卡片 focused 时 border-primary ring-1 ring-primary animate-pulse→FOCUS_PULSE_MS(2000ms) 自动清除`。`memory-view.tsx:769-784,296-299`。**跨页定位高亮直接复制此范式**。
- `VirtualGroupedList.scrollToItem(itemId,align)/scrollToGroup(groupId)`。`virtual-grouped-list.tsx:24-27`。
- `HealthCheck.target.route` + `overview.activateHealthCheck` navigate 到页面 (无资产级定位)。

### 可复用 UI / i18n
- `Chip` (语义 tone + startContent 图标), memory `SourceBadge` 范式 (图标+Chip), `ScopeBadge`, `Puzzle` 图标 (text-purple-500)。`chip.tsx`, `scope-badge.tsx`。
- i18n `capabilities.plugins.*` 已有 (enabled/disabled/contains/noComponents); 需新增 fromPlugin/viewPlugin 等。
- 无现成行级高亮工具 (除 memory-view focused 范式); MOTION tokens (`motion.ts`)。

## 核心设计挑战
跨页"一键跳到另一页并定位+高亮+展开某行/某插件", 跨**异构容器** (虚拟列表 / Accordion / 阶段视图 / 普通列表)。需要:
1. **跨页焦点传输**: activeSection 是 prop 非 URL 派生; 用 react-router `navigate(path,{state:{focus}})` 传 focus 意图 (省 URL 清理, ephemeral, 浏览器返回自然失效) — 比 query param 简单, 满足"点击跳转"。
2. **统一焦点契约 + 每页 locator 适配**: 共享 `useFocusTarget` (读 location.state.focus → 暴露 focusId + 高亮生命周期, 复用 memory-view 2s pulse)。每页按自身容器实现"定位+展开"。
3. **可点击来源插件徽标** `PluginOriginBadge` (Puzzle+插件名 Chip, 点击 navigate 到 /capabilities/plugins + focus=pluginId)。
4. **插件页组件行可点击** → navigate 到 routeForAsset(组件) + focus=组件id。

## 复用清单 (直接用)
- `search-dialog.routeForAsset` → 抽到 shared `lib/asset-route.ts` 供双向用。
- memory-view focus 范式 → 抽共享 `useFocusTarget` hook + 共享高亮 class。
- `VirtualGroupedList.scrollToItem`, `Chip`/`ScopeBadge`/`Puzzle`, HeroUI Accordion 受控 selectedKeys。

## 缺口 (要新建)
- 组件页无来源徽标; 组件页/插件页/MCP/Hooks 行缺统一 focus 消费; 插件组件行无 onClick; 无 location.state focus 契约; i18n fromPlugin/viewPlugin/jumpToComponent (en+zh)。
- 测试: 跨页 focus + 高亮 + 徽标点击导航 的 renderer 测试范式 (mock useNavigate/useLocation)。

## 测试策略
- 单测/renderer: `routeForAsset` 映射; `PluginOriginBadge` 点击 navigate 到正确路由+state; `useFocusTarget` 读 state→focusId→超时清除; 各页对 plugin-origin 资产渲染徽标; 插件组件行点击导航; 页面收到 focus state 时定位/高亮/展开 (断言 focused class / scrollToItem 调用 / Accordion 展开)。
- e2e (可选): 端到端双向跳转。

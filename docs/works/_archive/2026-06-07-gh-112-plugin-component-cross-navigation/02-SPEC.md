# 技术方案 (Design 产物)

## 架构: 共享焦点传输 + 每页 locator 适配 + 可点击徽标

纯渲染层。三件共享基建 + 各页接入。复用 memory-view 聚焦范式与 search-dialog 路由映射。

### S1 共享路由映射 `src/renderer/src/lib/asset-route.ts`
- `routeForAsset(asset: Asset): string | null` — 从 search-dialog `routeForAsset` 抽出并复用 (skill→/instructions/skills, agent→/instructions/subagents, command→/instructions/commands, output-mode→/instructions/output-modes, mcp-server→/capabilities/mcp, hook→/capabilities/hooks, plugin→/capabilities/plugins…)。search-dialog 改为 import 此共享版 (去重)。
- 验收: 各 type 映射正确; search-dialog 行为不变。

### S2 共享焦点契约 `src/renderer/src/hooks/use-focus-target.ts`
- 跨页传输: `navigate(path, { state: { focusAssetId } })`。
- `useFocusTarget(): { focusId: string | null; isFocused: (id) => boolean }`:
  - 读 `useLocation().state?.focusAssetId` → setFocusId; 进入后 `navigate(pathname, { replace:true, state:{} })` 清掉 state (避免返回/重渲染重复触发)。
  - `FOCUS_PULSE_MS = 2000` 后自动清 focusId (复用 memory-view 常量语义)。
- `FOCUS_HIGHLIGHT_CLASS = 'border-primary ring-1 ring-primary motion-safe:animate-pulse'` 共享常量 (与 memory-view 对齐; 后续可抽公共)。
- 验收: state 有 focusAssetId → focusId 置位且 2s 后清空; state 被 replace 清除。

### S3 可点击来源徽标 `src/renderer/src/components/shared/plugin-origin-badge.tsx`
- props `{ pluginId: string; pluginName?: string; className? }`。渲染 HeroUI `Chip`(size sm, variant flat, tone neutral, startContent `Puzzle` text-purple-500), 文案 `t('plugins.fromPlugin',{name})`; 整体可点击 (role/button + focus ring), onClick `navigate('/capabilities/plugins', { state:{ focusAssetId: pluginId } })`; `stopPropagation` 防触发外层卡片展开。
- 验收: 渲染插件名 + Puzzle; 点击导航到 plugins 页且带 focus state; 键盘可达。

### S4 插件页 (capabilities › plugins) 双向接入
- **组件行可点击 (插件→组件)**: PluginCard 组件行 (`data-plugin-component`) 改为 button, onClick `navigate(routeForAsset(component), { state:{ focusAssetId: component.id } })`; hover/focus 反馈 + 右侧 ChevronRight 暗示可跳转。
- **插件被 focus (组件→插件)**: Capabilities 页用 `useFocusTarget`; 给 PluginCard 外层加 `id="plugin-card-${plugin.id}"` + 收 `focused` prop; focused 时加 `FOCUS_HIGHLIGHT_CLASS` + 默认展开其 Accordion (受控 selectedKeys 全开) + `scrollIntoView({block:'center'})`。
- 验收: 点组件行跳到对应组件页并带 focus; 从组件页跳来时该 PluginCard 高亮+展开+滚动到中。

### S5 Instructions 页接入 (skills/subagents/commands/output-modes)
- **徽标**: SkillCard/GenericAssetCard 在 `meta.pluginId` 存在时, 顶部行 ScopeBadge 旁渲染 `PluginOriginBadge`。
- **被 focus**: 页面持 `VirtualGroupedList` ref (如未持则补) + `useFocusTarget`; focusId 命中时 `listRef.scrollToItem(focusId,'center')` + 该卡片 `focused` prop → 高亮 + 自动展开。
- 验收: plugin-origin skill/subagent/command 显示徽标可跳插件; 从插件页跳来时定位高亮展开。

### S6 Capabilities MCP / Hooks 接入
- **徽标**: McpServerCard / HookAssetRow 在 `meta.pluginId` 存在时显示 `PluginOriginBadge`。
- **被 focus**: McpServerCard 列表用 focusId 高亮+展开匹配卡 (普通列表, 直接 scrollIntoView via id `mcp-card-${id}`); Hooks 用既有 `hook-stage`/为 HookAssetRow 加 `id="hook-row-${id}"` + focusId 高亮 + scrollIntoView。
- 验收: plugin-origin mcp/hook 显示徽标可跳插件; 从插件页跳来定位高亮。

## i18n (en+zh)
- `plugins.fromPlugin` = "来自 {{name}}" / "From {{name}}"
- `plugins.jumpToComponent` (组件行 aria) = "跳转到组件 {{name}}" / "Open component {{name}}"
- `plugins.viewPlugin` (徽标 aria) = "查看插件 {{name}}" / "View plugin {{name}}"

## 测试矩阵
| 项 | 测试 | 断言 |
|---|---|---|
| S1 | tests/renderer/asset-route.test.ts | type→route 映射全覆盖 |
| S2 | tests/renderer/use-focus-target.test.tsx | state→focusId; 2s 清; state replace 清 |
| S3 | tests/renderer/plugin-origin-badge.test.tsx | 渲染名+图标; 点击 navigate(plugins, state) |
| S4 | tests/renderer/capabilities-plugin-nav.test.tsx | 组件行点击 navigate(组件页,state); focus→PluginCard 高亮+展开 |
| S5 | 扩展 capabilities-plugins/新 instructions-plugin-nav.test.tsx | 徽标渲染; focus→卡片 focused+scrollToItem |
| S6 | 扩展 capability-assets / 新 | mcp/hook 徽标; focus 高亮 |

## 界面质量与交互验收 (verify)
徽标视觉 (Puzzle+插件名, neutral chip, 不与 ScopeBadge 抢眼)、可点击反馈 (hover/focus ring/cursor)、跳转后定位高亮 (ring+pulse 2s)、Accordion 自动展开动画、滚动居中、键盘可达、i18n。主观项 (徽标位置/高亮强度) 截图请用户确认 (除非自主完成指令)。

## 不做 (本任务外)
- 后端 relations IPC 改造 / 持久化 (Tier-2, 现客户端 pluginId 足够)。
- URL 级 deep-link/bookmark (ephemeral location.state 足够; 如需再起 issue)。
- 插件生命周期 (启用/禁用/更新) 管理。

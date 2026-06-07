# 任务清单 (活清单)

从 02-SPEC 拆解。先建共享基建 (P1), 再按页面接入 (P2 插件页 → P3 instructions → P4 mcp/hooks), 最后收口 (P5)。小步提交。

## 实现项

- [ ] **P1 共享基建** (S1+S2+S3 + i18n)
  - `lib/asset-route.ts` (抽 routeForAsset, search-dialog 改 import 复用); `hooks/use-focus-target.ts` (location.state 焦点契约 + FOCUS_HIGHLIGHT_CLASS + FOCUS_PULSE_MS); `components/shared/plugin-origin-badge.tsx` (可点击 Puzzle+插件名 Chip → navigate plugins+state); i18n plugins.fromPlugin/viewPlugin/jumpToComponent (en+zh)。
  - tests: asset-route.test.ts; use-focus-target.test.tsx; plugin-origin-badge.test.tsx。
- [ ] **P2 插件页双向接入** (S4)
  - PluginCard 组件行可点击 → navigate(routeForAsset(component),state); Capabilities 用 useFocusTarget, PluginCard focused 时高亮+展开+scrollIntoView, 外层 id=plugin-card-${id}。
  - tests: capabilities-plugin-nav.test.tsx (组件行点击导航; focus→PluginCard 高亮+展开)。
- [ ] **P3 Instructions 页接入** (S5)
  - SkillCard/GenericAssetCard 加 PluginOriginBadge (meta.pluginId 时); 页面持 VirtualGroupedList ref + useFocusTarget, focus→scrollToItem+卡片 focused 高亮+展开。
  - tests: instructions-plugin-nav.test.tsx。
- [ ] **P4 MCP/Hooks 接入** (S6)
  - McpServerCard / HookAssetRow 加 PluginOriginBadge; focus→高亮+展开+scrollIntoView (id=mcp-card-${id}/hook-row-${id})。
  - tests: 扩展 capability-assets / 新 capabilities-mcp-hook-nav.test.tsx。
- [ ] **P5 收口** — 全量回归 (`pnpm test` + scan-engine + build + harness:check); agent 冷启视觉验收 (徽标 + 双向跳转高亮); 截图请用户确认主观项。
  - tests: 全绿; 视觉验收。

## 并行/顺序
- P1 必先 (其余依赖)。P2/P3/P4 文件多不重叠 (capabilities.tsx vs instructions.tsx vs hooks-lifecycle-view.tsx), 但 P2/P4 同 capabilities.tsx → 顺序; P3 独立可穿插。小步提交。
- 风险点: VirtualGroupedList ref 接入 (P3)、HeroUI Accordion 受控展开 (P2)、focus state replace 时序 (P1)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

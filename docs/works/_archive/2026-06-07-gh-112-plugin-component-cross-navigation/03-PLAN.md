# 任务清单 (活清单)

从 02-SPEC 拆解。先建共享基建 (P1), 再按页面接入 (P2 插件页 → P3 instructions → P4 mcp/hooks), 最后收口 (P5)。小步提交。

## 实现项

- [x] **P1 共享基建** (S1+S2+S3 + i18n) — 提交 bbeb0bf3
  - `lib/asset-route.ts` (抽 routeForAsset, search-dialog 复用); `hooks/use-focus-target.ts` (location.state 契约, 消费一次后 replace, FOCUS_PULSE_MS 2s 自清, FOCUS_HIGHLIGHT_CLASS); `PluginOriginBadge` (可点击 Puzzle+名 → navigate plugins+state); i18n plugins.* (en+zh)。
  - tests: ✅ asset-route (15) / use-focus-target (3) / plugin-origin-badge (3); search-dialog 无回归。
- [x] **P2 插件页双向 + MCP** (S4 + S6-MCP) — 提交 2af42cbe
  - PluginCard 组件行可点击 button → navigate(routeForAsset,state)+ChevronRight; focused→FOCUS_HIGHLIGHT_CLASS+受控 Accordion 全展开+scrollIntoView, id=plugin-card-${id}。MCP 卡 badge (同级避嵌套 button)+focused。新增 lib/plugin-origin.ts。setup 补 scrollIntoView stub。
  - tests: ✅ capabilities-plugin-nav (3, 组件行导航/focus 高亮展开/MCP 徽标); capabilities-plugins/capability-assets 无回归。
- [x] **P3 Instructions 页** (S5) — 提交 589c3e91
  - SkillCard/GenericAssetCard badge (同级)+focused 高亮+自动展开; 页面 VirtualGroupedList ref + useFocusTarget→scrollToItem 定位。instructions-guidance 两处裸 render 补 Router。
  - tests: ✅ instructions-plugin-nav (2, 徽标只在 plugin skill/focus 高亮展开)。
- [x] **P4 Hooks 页** (S6-Hooks) — 提交 06501796
  - HookAssetRow badge (div 无嵌套)+id=hook-row-${id}+focused 高亮; HooksLifecycleView useFocusTarget+getElementById scrollIntoView; isFocused 经 stage/event 透传。hooks-lifecycle-view 测试补 Router。
  - tests: ✅ capabilities-hook-nav (2, 徽标/focus 高亮); hooks-lifecycle-view 29 无回归。
- [x] **P5 收口** — ✅ 全量回归 117 文件 764 用例 + scan-engine 24 + build + harness:check 全绿; agent 冷启实测双向跳转 (Skills 11 徽标; 徽标→插件页高亮展开; 插件组件行→组件页高亮展开), 截图已发用户。
  - tests: ✅ 全绿; 视觉验收通过。

## 并行/顺序
- P1 必先 (其余依赖)。P2/P3/P4 文件多不重叠 (capabilities.tsx vs instructions.tsx vs hooks-lifecycle-view.tsx), 但 P2/P4 同 capabilities.tsx → 顺序; P3 独立可穿插。小步提交。
- 风险点: VirtualGroupedList ref 接入 (P3)、HeroUI Accordion 受控展开 (P2)、focus state replace 时序 (P1)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

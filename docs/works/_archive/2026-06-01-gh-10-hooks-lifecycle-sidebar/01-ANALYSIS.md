# 需求分析 (Explore 产物)

## 现状理解
- Hooks 页面由渲染层组件 `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 实现, 从 `src/renderer/src/pages/capabilities.tsx` 的 hooks tab 渲染进入。
- 当前页面顶部功能区包含三类东西: 生命周期/对照 Agent 视图切换、舒适/紧凑密度切换、Agent 级 Hooks 开关面板。用户明确只保留视图切换, 删除密度切换和“全部禁用/启用”入口。
- Hook 健康检查已经实现, 不是占位: 组件通过 `useHealthChecks()` 调用 `window.api.assets.healthCheck()`, 再用 `assetType === 'hook'` 或 `target.route` 过滤 Hook 检查, 并按当前 Agent view 过滤。
- 生命周期左侧索引已经有 `xl:sticky xl:top-4`, 但只在 xl 断点启用, 且没有独立高度/溢出约束。页面滚动容器是 `AppLayout` 里的 `main.flex-1.overflow-auto`, sticky 需要在这个滚动容器内工作。

## 关联与依赖
- 渲染层仍不能直接访问 Node; 保留的健康检查继续走 preload 暴露的 IPC API。
- 删除 Agent 级开关面板只影响本页 UI; `window.api.hooks.statuses()` / `setEnabled()` 和主进程 hooks-manager 暂不删除, 避免扩大到 IPC/主进程契约清理。
- 行级 Codex hook 开关不是“全部禁用”入口, 当前需求没有要求删除; 保持现有行为, 避免把范围扩大到单 Hook 管理能力。
- 测试覆盖集中在 `tests/renderer/hooks-lifecycle-view.test.tsx`; 需要同步删掉密度切换测试和 Agent 级开关展示测试, 增加/调整 UI 精简与 sticky 结构断言。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Hooks 功能区只保留“生命周期 / 对照 Agent”视图切换和当前 Agent view 标记; 不再显示“舒适 / 紧凑”密度切换。
2. 页面不再渲染 Agent 级 Hooks 开关面板, 也不再出现“全部禁用 / 全部启用”按钮。
3. Hook 健康检查继续显示摘要和详情; 有检查项时仍能跳转到详情并打开来源。
4. 生命周期模式下, 左侧生命周期索引作为页面内侧栏在桌面宽度 sticky 固定, 不随右侧内容滚出视口; 内容过长时侧栏自身可滚动。
5. 对照 Agent 模式继续正常渲染比较表; 搜索和 scope 筛选提示继续只影响 Hook 行。
6. 目标 renderer 测试、web 类型检查和 harness 检查通过。

## 未决问题
留给 design 向人澄清。
- 无。

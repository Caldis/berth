# 需求分析 (Explore 产物)

## 现状理解

当前健康检查链路跨 renderer、preload、IPC 和 main:

1. `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 在 Hooks 生命周期视图里调用 `useHealthChecks()`。
2. `src/renderer/src/pages/overview.tsx` 也调用同一个 `useHealthChecks()`。
3. `src/renderer/src/hooks/use-ipc.ts` 中的 `useHealthChecks()` 每次挂载都会立刻执行 `refresh()`。
4. `refresh()` 经 preload 调用 `window.api.assets.healthCheck()`。
5. `src/main/ipc/handlers.ts` 的 `assets:health-check` handler 当前直接执行 `await scanner.scanAll()`。
6. `scanner.scanAll()` 会串行调用 Claude Code 和 Codex adapter 的 `scanAll()`, 更新资产缓存、错误缓存和 asset map。
7. `runHealthChecks()` 随后基于 scanner 缓存、扫描错误和本机路径做同步健康检查。

因此 Hooks 页面切换慢的主因不是 hook card 渲染, 而是页面挂载触发健康检查, 健康检查又强制触发全量扫描。已有 `AssetScanner.hasScanned()` 和 `ensureScanned()` 能避免首次扫描后的重复扫描, 但 `assets:health-check` 没有使用这个能力。

## 关联与依赖

- `useHealthChecks()` 同时服务 Overview 和 Hooks。修复不能只照顾 Hooks, 否则 Overview 会继续重复打 IPC。
- watcher 通过 `assets:changed` 通知 renderer。现有 `useHealthChecks()` 收到变更后会再次调用 `refresh()`。
- 若 main handler 只改成 `ensureScanned()`, 文件变更后健康检查可能一直基于旧 scanner 缓存。因此需要区分“页面切换复用结果”和“资产变更强制刷新”。
- IPC 类型在 `src/shared/types/ipc.ts`, preload 暴露在 `src/preload/index.ts` / `src/preload/index.d.ts`。如果新增参数或返回字段, 必须同步更新。
- Hooks 侧边栏当前只接收 `checks` 和 `loading`, 展示 loading / ok / summary tag, hover 展示详情。

## 任务分类与 debt 校准

- type / maintenance.subtype: `bug`
- source.kind / refs: `docs-issues`, `docs/issues/2026-06-02-BUG-hooks-health-check-latency.md`
- debt estimate 修正: 初始估算仍准确。影响 renderer hook、preload/IPC 类型和 main handler, 属于 cross-process 但范围清楚。
- scope / risk / areas / confidence: `cross-process` / `medium` / `performance, architecture, testability` / `medium`
- revision: 无需修正。

## 验收标准

1. Hooks 页面切换时, 若已有健康检查结果, 不应再次强制全量扫描。
2. 首次进入或无缓存时仍能触发健康检查, 并得到正确结果。
3. 收到 `assets:changed` 后应标记现有结果为 stale, 保留旧结果可见, 并在后台强制刷新。
4. 并发的健康检查刷新应复用同一个 in-flight 请求, 避免 Overview 和 Hooks 同时挂载时重复请求。
5. main 端 `assets:health-check` 应支持“非强制读取缓存”和“强制刷新”两种路径, 非强制路径不重复 `scanAll()`。
6. Hooks 侧边栏 loading/stale tag 应说明检查范围: 只展示 hook 且匹配当前 Agent 视角的健康检查。
7. UI 交互不应新增平铺说明区块; 状态详情继续放在 hover/focus tooltip 中。
8. Overview 的健康检查展示不退化; 共享 hook 的变更不能让 Overview 丢失健康检查结果。

## 界面质量与交互验收

- 页面结构: Hooks 生命周期页左侧是 sticky 生命周期 sidebar, 健康检查状态已经合并在 sidebar 内。
- 设计系统: 现有状态 tag 使用小尺寸按钮 + tooltip, 适合继续承载 loading/stale/ok/details, 不新增卡片。
- 信息密度: 高频区域不能因为健康检查增加额外平铺文本。需要把“当前显示旧结果, 后台刷新中”的提示压缩为 tag 文案和 tooltip 说明。
- 可见状态: 至少覆盖首次检查、后台刷新已有结果、检查正常、有 warning/error/info 结果。
- 交互反馈: hover/focus tooltip 应说明检查范围和 stale 语义; 旧结果刷新中时仍展示旧结果的 severity tags。
- 响应式和可访问性: 继续使用 button + tooltip, 保持键盘 focus 可达, 不依赖纯 hover。

## 未决问题

无。实现可按“共享 renderer 缓存 + in-flight 去重 + IPC refresh 参数 + Hooks stale tag”推进。

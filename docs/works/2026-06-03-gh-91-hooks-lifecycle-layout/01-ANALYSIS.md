# 需求分析 (Explore 产物)

## 现状理解

本任务只涉及 renderer UI。`docs/ARCHITECTURE.md` 定义渲染层位于 `src/renderer/src/`, 通过 preload 调 IPC; 本次不修改主进程、preload 或 IPC 契约。

当前 Hooks 页面由 `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 负责:

- `HooksLifecycleView` 先渲染筛选提示与 `HookRecoveryCenter`, 再渲染 `lg:grid-cols-[280px_minmax(0,1fr)]` 的左侧生命周期索引与右侧阶段列表。
- 左侧 `aside` 已是 desktop sticky, 但恢复中心位于整个 grid 上方, 不在左侧生命周期块内。
- 当前 active stage 只在点击生命周期按钮时由 `scrollToStage()` 更新; 右侧自然滚动不会更新 `aria-current`。
- 阶段右侧卡片由 `HookStageSection` / `UnknownHookSection` 渲染, 每个 section 有稳定 id: `hook-stage-${group.id}`。
- Hook 检查由 `HookHealthSignal` 内嵌在左侧索引卡片中, 但摘要与 severity tag 使用 `flex-wrap`, 可在窄宽度下换行。
- `HookStageRecommendations`, `AgentSupportTips`, `HookAssetRow` 多处 tag 采用 `flex-wrap`; 用户点名的 “Hook 检查”主要指 `HookHealthSignal`。

## 关联与依赖

关联文件:

- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`: 布局、滚动高亮、连线、Hook 检查与恢复中心展示。
- `tests/renderer/hooks-lifecycle-view.test.tsx`: 已覆盖 sticky sidebar、点击高亮、Hook 检查 hover、恢复中心与 Hook 行展示。
- `tests/setup.ts`: 已提供 `ResizeObserver` mock, 尚无全局 `IntersectionObserver` mock。
- `src/renderer/src/i18n/locales/en.json` / `zh.json`: 现有文案已足够, 新增布局不要求新增用户可见文案。

外部实现依据:

- MDN Intersection Observer API: 可异步观察目标与 viewport 或指定 root 的交集变化, 避免频繁 scroll handler 主线程计算。https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- web.dev IntersectionObserver: 同一个 observer 可 observe 多个元素; 对 scrollable div 可设置 `root`; 回调异步, 适合可见性判断, 不适合逐像素动画。https://web.dev/articles/intersectionobserver?hl=en
- MDN SVG fills and strokes: `stroke-linecap="round"` 产生圆角端点, `stroke-linejoin="round"` 控制线段连接处圆角。https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Fills_and_strokes
- MDN ResizeObserver / getBoundingClientRect: `ResizeObserver` 观察元素尺寸变化; `getBoundingClientRect()` 返回 viewport 坐标, 滚动会改变返回的边界值。https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver / https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

实现判断:

- 滚动高亮使用 `IntersectionObserver` 观察右侧 section, 依据可见比例与 section top 选择 active stage; 保留点击时的 immediate active 状态。
- 连线使用一个覆盖在 grid 内部的 pointer-events-none SVG overlay。坐标通过左侧按钮与右侧 section 的 `getBoundingClientRect()` 计算, 换算为 overlay 容器内坐标; 用 `M x y H mid Q ... V ... Q ... H ...` 或等价 path 生成圆角直线。
- 连线只在 desktop grid 可见, mobile 单列布局隐藏, 避免横向空间不足。
- 使用 `ResizeObserver` 监听 grid 容器尺寸变化; scroll / resize 中的坐标重算放入 `requestAnimationFrame`, 避免同一帧重复 layout 读取。

## 任务分类与 debt 校准
- type / maintenance.subtype: feature, 无 maintenance subtype。
- source.kind / refs: user-request, GitHub Issue #91。
- debt estimate 修正: 维持 incurred=3, repaid=0, net=3。
- scope / risk / areas / confidence: module / medium / ui-ux / medium。
- revision: 0.0-new 初估从 architecture 校准到 ui-ux; 当前不需要继续修正。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. Hook 检查与恢复中心出现在左侧生命周期区域下方, desktop 滚动时与生命周期索引保持同一 sticky 列。
2. Hook 检查展示在 280px 左侧列内不发生 tag 来回换行; severity / status 信息保持可读, hover/focus 详情仍可用。
3. 右侧阶段 section 滚动进入视口时, 左侧对应生命周期按钮同步设置 `aria-current="true"` 并更新高亮; 点击生命周期仍滚动到对应 section。
4. 左侧生命周期条目与右侧同 stage section 之间显示圆角直线连线; active stage 连线更突出, 非 active 连线不干扰阅读。
5. 移动端或窄视口不显示跨列连线, 页面无横向滚动。
6. 现有 Hook 行、raw JSON、启停、恢复中心、健康检查 hover 与 i18n 行为保持不变。
7. renderer 测试覆盖左侧重排、Hook 检查不换行结构、滚动同步、连线 SVG 与现有行为回归。

## 界面质量与交互验收

现有页面结构是顶部筛选提示 + 左侧 sticky 生命周期索引 + 右侧阶段详情。设计系统使用 Tailwind、rounded-md/rounded-lg、border、muted/card 语义色、lucide 图标, 属于安静的桌面工具 UI。

信息密度: 左侧列宽 280px, 需要生命周期列表、Hook 检查、恢复中心共用一列。Hook 检查应改为纵向状态面板, 用固定行结构替代 tag 横向堆叠。恢复中心默认折叠, 保持信息密度。

主要用户路径:

- 浏览生命周期, 右侧滚动时左侧同步定位。
- 点击左侧生命周期跳转右侧阶段。
- hover/focus Hook 检查状态查看详情。
- 展开恢复中心并恢复/清理恢复点。

可见状态:

- Hook 检查 loading/stale/clear/warning/error/info。
- 恢复中心 loading/error/empty/issue/recoverable/source-missing。
- stage active/inactive, empty stage, unknown stage。
- desktop connector active/inactive。

交互与可访问性风险:

- IntersectionObserver 缺失时需保留默认 active stage 与点击跳转, 不让页面空白。
- 连线 SVG 应 `aria-hidden` 且 `pointer-events-none`, 不进入键盘焦点。
- active stage 继续使用 `aria-current`.
- Hook 检查详情 button 保持 focus-visible ring。
- 连线坐标读取依赖 layout, 应在 RAF 中批量执行, 避免 scroll 期间频繁同步重排。

## 未决问题
留给 design 向人澄清。

无。用户已指定目标布局、滚动同步、连线形态与搜索要求; 具体视觉参数按现有 Hooks 页面风格保守实现。

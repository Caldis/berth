# 需求分析 (Explore 产物)

## 现状理解
纯 renderer (单进程) UI 层问题, 不涉及 main / IPC / 数据契约。

- **共享组件** `src/renderer/src/components/shared/empty-state.tsx`: 堆叠卡片占位图 + `rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center`, 内部已 `flex flex-col items-center justify-center`。问题: 固定 `py-14`, 无高度撑满, 内容少时贴内容区顶部, 整体不垂直居中 (截图 1/2/3)。
- **capabilities 本地同名组件** `src/renderer/src/pages/capabilities.tsx:62-69`: `flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16` + 单个大图标 `Icon h-10 w-10`, 无堆叠卡片占位图 (截图 4)。这是同名遮蔽 (shadowing) 导致的视觉不一致直接来源。

### 高度链 (决定"撑满")
`app-layout.tsx`:
```
<div flex h-[100dvh] overflow-hidden>            // 视口
  <div relative flex min-w-0 flex-1 flex-col>    // 右列 flex column
    <TopNavigation/>                              // 悬浮 (absolute) 覆盖, 不占 flow (issue #99 待重构)
    <main min-h-0 flex-1 overflow-auto>           // = 100dvh (因 TopNav 悬浮)
      <div style={contentStyle}>                  // 仅 padding: top=top-offset, bottom/l/r=gutter; 无 height ← 断点
        {children}                                 // 页面根 (space-y-X, height:auto)
```
- 断点: `contentStyle` div 只有 padding 无 height; 页面根是普通块 (height auto)。内容少时空态只有自身高度 → 贴顶留白。
- 可用 CSS 变量: `--berth-page-gutter` (globals.css:27, 全局 1.5rem) 与 `--berth-page-top-offset` (main inline style, 子树可继承) → 内容区可视高度 = `calc(100dvh - var(--berth-page-top-offset) - var(--berth-page-gutter))`。变量惰性求值, 在页面根节点解析。

## 关联与依赖
空态渲染点 (来自全量审计):

### A 类 — 整页空态 (本任务: 需撑满内容区 + 居中)
| # | 位置 | icon | 容器特征 |
|---|---|---|---|
| 1 | sessions.tsx:184 | MessageSquare | 页面根 `space-y-6` 内, chrome 经 usePageChrome portal 到 TopNav → 根内仅空态 (chrome-less) |
| 2 | session-detail.tsx:115 | FileText | 同上 chrome-less |
| 3 | memory-view.tsx:735 | Brain | 同上 chrome-less |
| 4 | instructions.tsx:465 / 480 | 动态 / FileText | 根 `space-y-4` 内, `InstructionPageChrome` 在流 → 工具条 + 空态上下排列 (in-flow-chrome) |
| 5 | capabilities.tsx:869 mcp / 884 plugins / 902 default | Plug/Puzzle/动态 | renderContent 直接返回, 根 `space-y-4` + `CapabilityPageChrome` 在流 (in-flow-chrome) |
| 6 | capabilities.tsx:752 env (EnvSection) | Variable | EnvSection 空时直接返回空态 (section 的唯一输出) |
| 7 | capabilities.tsx:573 statusLine (StatusLineSection) | Activity | 嵌在 `space-y-3` 内, 且可能伴随 `CodexDefaultStatusLine` 同级 (深层 + 有伴随内容, 特殊) |
| 8 | capabilities.tsx permissions (PermissionsSection) | Variable | section 内, 处理同 env |

### B 类 — 区块内局部空态 (本任务: 保持现状, 不撑满)
嵌在卡片/分区内, 与其他内容并存, 已用 `className="border-0 py-X"`:
- overview.tsx:296 / 375 / 462 (dashboard 卡片内)
- local-sources-section.tsx:61 / 155 (settings section 内)
- agent-capability-plugins-section.tsx:101 (settings section 内)

> 用户截图均为 A 类整页空态。B 类语义不同 (局部), 不应填满整页, 本任务不改其布局, 仅 verify 确认未被波及。

## 任务分类与 debt 校准
- type / maintenance.subtype: **bug** (用户报告的可见视觉不一致缺陷); 不改为 maintenance。
- source.kind / refs: user-request / GH-101。
- debt estimate 修正: 改动文件数比初估多 (6+ renderer 文件), 但均为展示层、无逻辑/数据契约变更; 删除 capabilities 本地实现属偿还。
- scope / risk / areas / confidence: scope=module; risk **low→medium** (页面根改 flex 链可能影响非空列表布局, 需逐页回归); areas=ui-ux; confidence=medium。
- revision: 见 INDEX `debt.revisions[]` (explore 追加)。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. **单一来源**: 删除 capabilities.tsx 本地 `EmptyState`, 全站整页空态只用共享 `components/shared/empty-state.tsx`; 全站空态视觉一致 (堆叠卡片占位图)。
2. **撑满**: A 类整页空态的圆角虚线矩形撑满其内容区 (chrome-less 页填满整个内容区; in-flow-chrome 页填满工具条下方剩余区), 工具条下方无溢出滚动。
3. **居中**: 空态占位图 (图标 + 文案) 在撑满后的矩形内垂直、水平都居中。
4. **不波及局部空态**: B 类局部空态 (overview / settings) 布局与外观不变。
5. **门禁**: typecheck / lint / 目标 renderer 测试通过; 视觉用 electron 实测窗口坐标截图验收。

## 界面质量与交互验收
- 现有设计系统: Tailwind + `cn()`; 空态、加载态 (`LoadingState`)、错误态分离的 shared primitives。
- 信息密度: 列表页 (sessions/memory) 有 CategoryJumpNav + VirtualGroupedList; capabilities/instructions 为多 tab。
- 可见状态: loading / empty / list 三态切换; 本任务只动 empty 态布局, 不动 loading/list。
- 响应式: `max-lg:flex-col` 等断点; 空态 flex 居中天然响应式。
- 可访问性: 占位图 `aria-hidden`; 文案来自 i18n (`common.empty` / 各页 `*.empty.*`)。
- 风险: 页面根接 flex 高度链时, 非空 (列表) 分支须保持原滚动与密度。

## 未决问题
- 已由用户在 design 澄清: 采用 **逐页精确填满** (工具条下方精确填满、无溢出, 不碰 app-layout)。
- statusLine 空态伴随 `CodexDefaultStatusLine` 时的填满语义 → design 决定: section 根可 flex-1 撑满, 空态 fullHeight, 伴随卡片保持在其下 (不强制空态吃满全部)。

# 需求分析 (Explore 产物)

## 现状理解
- 纯 renderer 改动, 无 main / IPC 介入。核心组件 `src/renderer/src/components/shared/file-viewer-drawer.tsx` (`FileViewerDrawer`)。
- 组件被两处消费, 最终渲染同一 `FileViewerDrawer`:
  - 记忆模块: `memory-view.tsx:368` 的 `FileViewerButton` → `file-viewer-button` → `openInspector` store → `InspectorDrawer`。
  - 全局挂载: `app-layout.tsx:81` 的 `<InspectorDrawer />` (`inspector-drawer.tsx` 直接转发 `FileViewerDrawer`)。
  - 故本次改动同时作用于"记忆 md 查看器"与任何 inspector 入口, 表现一致化。
- 窗口与平台 (`src/main/index.ts`): macOS `titleBarStyle: 'hiddenInset'` + `trafficLightPosition {x:16,y:16}` (红绿灯浮于左上); Windows `frame:false` + 自定义 `window-controls` (右上, fixed z-[10000])。
- app-region (`globals.css:218-224`): `.titlebar-drag{-webkit-app-region:drag}` / `.titlebar-no-drag{...no-drag}`。顶部 `top-navigation` (min-h-72px) 整条为 `titlebar-drag`, 内部控件 `titlebar-no-drag`; `sidebar.tsx:80` 顶部 `titlebar-drag h-9` spacer 为红绿灯让位。

## 关联与依赖
- `FileViewerDrawer` 结构: backdrop (fixed 全宽 z-9980, `onClick=onClose`) + drawer (fixed right-0 z-9990, `titlebar-no-drag`) + resize handle (左缘 top-0 h-full) + header (`titlebar-no-drag`, copy/close 按钮) + content (pre)。
- 当前平台分支:
  - backdrop: `isMac ? 'top-10' : 'top-0'` (file-viewer-drawer.tsx:159)
  - drawer: `isMac ? 'top-10 h-[calc(100%-2.5rem)]' : 'top-0 h-full'` (file-viewer-drawer.tsx:171)
  - header: `isWindows && 'pr-48'` (file-viewer-drawer.tsx:192, 给 Windows 右上 window-controls 让位)
- 历史取舍 (由测试反推): `tests/renderer/inspector-drawer.test.tsx:144` 测试名 `leaves the macOS traffic-light strip uncovered by the backdrop` — `top-10` 的设计意图是让 **backdrop** 不用半透明黑盖住 macOS 顶部 40px 的 traffic-light 条。
- 回归红线: header 的 `titlebar-no-drag` (file-viewer-drawer.tsx:170/191) 是历史修复"关闭按钮落在 titlebar 拖拽区时不可点"的产物 (关联 c60f2b2 / 1526ebd Windows titlebar controls clickable)。

## 根因
macOS 分支把 `top-10` (40px 偏移) 同时施加到 backdrop 与 drawer。该偏移对 backdrop 有意义 (红绿灯在左上, 全宽 backdrop 会压暗红绿灯条), 但对 drawer 多余: drawer 固定在右侧 (`right-0`), 与左上红绿灯根本不重叠, 偏移只制造了面板顶部 40px 留白。Windows 分支 (`top-0 h-full`) 早已贴顶且工作正常。

## 方案取舍 (供 design 落定)
- 方案 B (采用): 仅把 drawer 的 macOS 分支 `top-10 h-[calc(100%-2.5rem)]` 改为 `top-0 h-full` 贴顶; backdrop 保留 `top-10`。满足贴顶诉求, 不动 header `titlebar-no-drag` (按钮可点), 保留 backdrop 对红绿灯条的保护 (尊重已被测试锁定的契约), 改动面最小。
- 方案 A (备选): drawer 与 backdrop 均 `top-0`。会让 backdrop 半透明遮罩盖住左上红绿灯条, 推翻 inspector-drawer.test 既有契约。仅当 verify 截图显示用户要求整屏遮罩时再评估。

## 任务分类与 debt 校准
- type: bug; 无 maintenance.subtype。
- source.kind: user-request; refs: GH-107。
- debt estimate 修正: new 初估 incurred 2 / scope module / risk medium / confidence low。explore 后收敛: 方案 B 仅改 drawer 两个 class + 同步 1 个 renderer 测试, backdrop 与红绿灯契约不动, 行为向 Windows 既有正确路径对齐。
- scope / risk / areas / confidence: file / low / [ui-ux] / high。
- revision: phase=explore, from {incurred:2, scope:module, risk:medium, confidence:low} → to {incurred:1, scope:file, risk:low, confidence:high}, reason: 根因定位为单组件单分支的冗余偏移, 方案 B 改动最小且有既有测试锁定。

## 验收标准
1. macOS 下打开 file viewer (记忆 md 查看器或 inspector), drawer 面板顶部贴合窗口顶部, 无顶部留白。
2. macOS 下 backdrop 仍从顶部 40px 起 (`top-10`), 左上 traffic-light 条不被半透明遮罩压暗, 红绿灯可见可点。
3. macOS 下 drawer header 的关闭 (×) 与复制按钮可正常点击 (`titlebar-no-drag` 生效), 不回归"关闭按钮无法交互"。
4. Windows 行为不变: drawer `top-0 h-full` 贴顶, header `pr-48` 给原生 window-controls 让位, window-controls 可点。
5. 既有交互全部保持: Escape 关闭、backdrop 点击关闭、Tab/Shift+Tab 焦点圈闭、复制反馈、左缘 resize。
6. memory 与 inspector 两入口表现一致 (同一组件)。

## 界面质量与交互验收
- 页面结构: 右侧抽屉 (slide-in-from-right), 模态 (aria-modal), header (路径+copy+close) + pre 内容区。
- 设计系统: Tailwind + lucide 图标 + `cn`; z 层级 backdrop 9980 / drawer 9990 / window-controls 10000。
- 信息密度: header 双行路径 (`truncatePath` 80 + 全路径 mono); 内容 pre wrap。
- 用户路径: 记忆条目展开 → View raw → drawer 打开。
- 可见状态: open/close 动画; copy 成功 Check 反馈 2s; 无独立 loading/error 态 (内容打开前已 load)。
- 交互反馈: hover、focus-visible ring、resize col-resize cursor。
- 响应式: width clamp 420-960, `min(100vw, width)`。
- 可访问性: role dialog / aria-modal / aria-label; 入场聚焦 close; Tab trap; Escape 关闭。
- 风险: macOS `hiddenInset` 顶部区内 `no-drag` 的实际可点性需实测 (app-region 在系统 titlebar 高度的行为); 窄窗口 (<420px) drawer 占满可能逼近左上红绿灯, 属极端边界, 不处理。

## 未决问题
无阻塞性歧义。方案 B 与 A 的取舍为可选偏好, 默认 B, 不阻塞 implement; 留待 verify 截图复核视觉是否符合用户预期。

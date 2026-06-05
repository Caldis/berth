# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: 用户截图反馈 (user-request), 2026-06-05。

## 复现步骤
1. 启动应用, 进入左侧 "记忆 (Memory)" 模块。
2. 在记忆条目中触发右侧 markdown 文件查看器 (侧边 sidecar drawer, `file-viewer-drawer.tsx`)。
3. 观察查看器面板顶部与窗口顶部之间的关系。

## 期望 vs 实际
- 期望: 侧边查看器面板顶部贴合窗口顶部 (flush to top), 与应用整体布局连续。
- 实际: 面板顶部被顶部窗口拖拽区 (dragarea) 留出的空白下推, 顶部出现一段空隙, 面板未到顶, 样式割裂 (见用户截图: 面板从标题栏下方开始, 顶部有明显留白)。

## 约束 (回归红线)
此前已修复 "查看器 header 被顶部 dragarea (`-webkit-app-region: drag`) 层级覆盖, 导致关闭按钮无法点击" 的问题 (相关历史提交: c60f2b2 make Windows titlebar controls clickable, 1526ebd refine windows titlebar controls)。本次让面板贴顶时, 必须保证 header 上的关闭 (×) / 复制按钮仍可正常点击 (`-webkit-app-region: no-drag` 正确生效), 不得为贴顶而让按钮重新落入不可点击的拖拽区。

## 涉及代码 (初判, explore 阶段细化)
- `src/renderer/src/components/shared/file-viewer-drawer.tsx` — 侧边查看器主体 (drawer + header + 复制/关闭按钮)
- `src/renderer/src/components/memory/memory-view.tsx` — 记忆模块入口, 挂载查看器
- 可能 `src/renderer/src/styles/globals.css` — app-region / 顶部布局相关样式

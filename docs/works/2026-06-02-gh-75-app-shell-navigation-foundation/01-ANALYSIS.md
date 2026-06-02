# 需求分析 (Explore 产物)

## 现状理解
- bobcorn 参考实现集中在 `D:\Code\bobcorn\src\renderer\containers\MainContainer\index.tsx`、`components\IconInfoBar\index.tsx`、`components\TitleBar\button\index.tsx` 和 `components\SideMenu\index.tsx`。
- bobcorn 的关键结构不是单纯“侧栏样式”: 它用三栏 flex 布局、可拖曳 `ResizeHandle`、左侧显隐状态、顶部 58px 信息栏和独立固定窗口按钮组。侧栏宽度写入配置, 拖曳时只改容器宽度, 主体区域保持 `min-w-0 flex-1`。
- berth 当前 shell 集中在 `src/renderer/src/components/layout/app-layout.tsx`、`sidebar.tsx`、`window-controls.tsx` 和 `nav-config.ts`。左侧栏是 fixed 定宽, 主体通过 `marginLeft` 跟随 `sidebarCollapsed`。目前没有可调宽状态、顶部面包屑栏、pin IPC, 也没有 sidebar resize handle。
- berth 当前窗口控制仅支持 minimize / maximize / close。preload、IPC 类型和 main handler 都没有 always-on-top 能力。
- Electron 官方 `BrowserWindow` 文档提供 `setAlwaysOnTop` / `isAlwaysOnTop`; frameless/custom window interaction 文档要求 draggable 区域和按钮 no-drag 区域明确分开。参考:
  - https://www.electronjs.org/docs/api/browser-window
  - https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions

## 关联与依赖
- 相关 renderer 状态: `useAppStore.sidebarCollapsed`、`agentView`、`searchOpen`、`inspectorOpen`。
- 相关 IPC: `window:minimize`、`window:toggle-maximize`、`window:close`、`window:is-maximized`、`window:maximized-change`。
- 相关测试: `tests/renderer/sidebar-agent-view.test.tsx`、`tests/renderer/window-controls.test.tsx`、`tests/e2e/app.e2e.ts`、`tests/e2e/window-controls.e2e.ts`。
- 后续 issue 依赖此任务的壳结构: 项目切换器、侧边栏信息架构、设置来源迁移、首页重构。

## 验收标准
1. 左侧边栏支持 expanded / collapsed / resized 三种基础状态, 宽度在安全范围内变化, 折叠时主体内容对齐正确。
2. 侧栏拖曳 handle 只在展开态可用, 拖曳时有明确 cursor / hover 反馈, 不挤压窗口控制区。
3. 主体顶部有独立导航栏, 带面包屑, 能根据当前路由显示 Overview / Sessions / Session detail / Instructions / Capabilities / Usage。
4. Windows 窗口控制区加入 pin 按钮, pin 调用 main process always-on-top 能力, 按钮状态和无障碍名称正确。
5. titlebar drag / no-drag 区域保持可点击性: sidebar 按钮、breadcrumb、window controls、搜索与设置入口都不被 drag 区域吞掉。
6. 单元测试、renderer 测试和 e2e 覆盖新增 shell 行为, 本地目标命令和 CI gate 通过。

## 界面质量与交互验收
- 设计方向: 保持当前黑白低饱和主题, 向 bobcorn 的“桌面工具壳”靠拢。避免装饰性渐变和大卡片, 优先清晰边界、紧凑工具栏和稳定内容区域。
- 页面密度: 左侧栏承载主导航, 顶部栏只承载当前路由、面包屑和窗口控制留白, 不重复页面内标题。
- 交互风险: 拖曳 resize 需要绑定 document mousemove / mouseup 并在 mouseup 清理 body cursor/user-select。折叠时不要保留不可见但可聚焦的导航文字。
- 可访问性风险: pin 按钮必须有 `aria-pressed`; resize handle 需要有可命名的 separator 或明确不进入 tab 流。本任务先支持鼠标拖曳, 键盘 resize 可作为后续增强。
- 响应式: 当前 Electron minWidth 为 900, 本任务按桌面工具布局验收。小宽度下边栏宽度 clamp 后主体仍需要 `min-w-0`。

## 未决问题
- 无阻塞问题。项目切换器、一级菜单全量迁移和首页重构不进入本任务。

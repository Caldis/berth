# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不改 IPC、preload、主进程窗口 API 和资产数据契约。
- 不改 `nav-config.ts` 的导航项集合; Overview 已存在于 `navSections`。
- 只改 renderer app shell 的可见状态、内容 offset、Windows 控制键定位和相关测试。

## 任务分类与 debt
- type / maintenance.subtype: `feature`; 不适用 maintenance subtype。
- source.kind / refs: `user-request`; `https://github.com/Caldis/berth/issues/96`。
- debt.estimate: 保持 `incurred=3, repaid=0, net=3, scope=module, risk=medium, areas=[ui-ux], confidence=medium`。`pnpm harness:stats` 显示 total debt 16/status ok, 不需要 override。
- debt.final 预期: 若实现保持在 app shell 和测试内, verify 阶段可收敛为 `net=1~2, risk=low`。
- revisions: 暂无。
- Project 字段同步: 0.0-new 已绑定 Project #6 item `PVTI_lAHOADXbEs4BZHvQzguoiT8`, 当前状态 `In Progress`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/renderer/src/components/layout/top-navigation.tsx`
  - 删除 `/` 的隐藏特殊分支, 让 `findNavMatch('/')` 返回的 overview route chrome 生效。
  - Windows padding 从 `pr-44` 调整为 `pr-52`, 对应 13rem。
- `src/renderer/src/components/layout/app-layout.tsx`
  - 删除 overview route 顶部 offset 特例, 所有页面统一使用 `calc(${topNavigationHeight}px + var(--berth-page-gutter))`。
  - 将 `topNavigationHeight` 传给 Windows `WindowControls`, 让控制键按真实导航栏高度居中。
- `src/renderer/src/components/layout/window-controls.tsx`
  - 新增可选 `navigationHeight` prop, 默认 72。
  - 容器样式使用 `top: navigationHeight / 2` + `-translate-y-1/2`, 保持固定右上覆盖层, 但垂直中心跟随导航栏高度。
- 测试文件:
  - `tests/renderer/top-navigation.test.tsx`
  - `tests/renderer/app-layout.test.tsx`
  - `tests/renderer/window-controls.test.tsx`

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 顶部导航继续作为 app shell, Overview 内容从导航栏下方开始; 不改 Overview hero 和卡片密度。 | `app-layout.test.tsx` 断言 `/` offset; 实测截图确认 hero 未被遮挡。 |
| 组件选择 / 设计系统一致性 | 复用 `TopNavigation`、`WindowControls` 和现有 Tailwind spacing; Windows padding 用 `pr-52`。 | `top-navigation.test.tsx` 断言 Windows class; 人工查看右侧动作区不与控制键重叠。 |
| 交互反馈 / 状态切换 | `data-state` 首页从 hidden 变 visible; 窗口控制按钮 API 调用和 pressed 语义不变。 | `top-navigation.test.tsx`、`window-controls.test.tsx`。 |
| loading / empty / error / disabled / focus | 本任务不改页面数据状态; focus ring、button label、search 快捷键保持原实现。 | 目标测试覆盖回归; 不新增状态分支。 |
| 响应式 / 可访问性 / 键盘可达 | 保留现有 grid/flex-wrap 与标题语义; Overview 显示 `h1`。 | renderer 单测查 heading; 视觉验证桌面宽度。 |
| 文案 / i18n / 数字和路径格式 | 复用 `nav.overview`, 不新增文案。 | en/zh 既有 i18n 测试不需改。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 首页导航显示并预留高度 | renderer | `tests/renderer/top-navigation.test.tsx`, `tests/renderer/app-layout.test.tsx` | `pnpm test -- tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx` | 不适用 |
| Windows 右侧 padding 为 13rem | renderer | `tests/renderer/top-navigation.test.tsx` | 同上 | 不适用 |
| Windows 控制键按导航栏高度居中 | renderer | `tests/renderer/window-controls.test.tsx` | `pnpm test -- tests/renderer/window-controls.test.tsx` | 不适用 |
| TypeScript 与 harness 状态 | typecheck / harness | 不适用 | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-96-navbar-windows-controls`; verify 阶段跑全局 `pnpm harness:check` | 不适用 |
| Windows 视觉避让 | manual / e2e | 可选用 Electron/Playwright 截图 | 启动应用后截图检查; 若时间允许跑 `pnpm test:e2e -- tests/e2e/window-controls.e2e.ts` | 纯视觉间距仍需截图判断 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 首页 route chrome 生效 | 1 |
| AppLayout 删除 overview offset 特例 | 2 |
| Windows `TopNavigation` padding `pr-52` | 3 |
| `WindowControls` 接收导航栏高度并居中 | 4 |
| 非 Windows 不渲染窗口控制键, 原测试保留 | 5 |
